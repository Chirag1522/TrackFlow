const prisma = require('../../config/db');
const generateTrackingId = require('../../utils/generateTrackingId');
const generateQR = require('../../utils/generateQR');
const { queueShipmentCreatedEmail, queueStatusUpdateEmail } = require('../../jobs/emailJobs');
const { getOrSetJSON } = require('../../utils/cache');
const { invalidateShipmentCaches } = require('../../utils/cacheInvalidation');
const { validateSenderReceiverEmails } = require('../../utils/validateEmail');

const getTtl = (envValue, fallback) => {
  const parsed = Number(envValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const SHIPMENTS_LIST_CACHE_TTL_SECONDS = getTtl(process.env.CACHE_SHIPMENTS_TTL_SECONDS, 20);
const SHIPMENT_DETAIL_CACHE_TTL_SECONDS = getTtl(process.env.CACHE_SHIPMENTS_TTL_SECONDS, 20);
const AGENT_WORKITEMS_CACHE_TTL_SECONDS = getTtl(process.env.CACHE_WORKITEMS_TTL_SECONDS, 15);
const AVAILABLE_AGENTS_CACHE_TTL_SECONDS = getTtl(process.env.CACHE_AVAILABLE_AGENTS_TTL_SECONDS, 30);

const VALID_STATUSES = ['Created', 'Picked_Up', 'At_Sorting_Facility', 'In_Transit', 'Out_for_Delivery', 'Delivered', 'Failed', 'Retry', 'Returned'];

const TRANSITIONS = {
  Created: ['Picked_Up'],
  Picked_Up: ['At_Sorting_Facility'],
  At_Sorting_Facility: ['In_Transit'],
  In_Transit: ['Out_for_Delivery'],
  Out_for_Delivery: ['Delivered', 'Failed'],
  Failed: ['Retry', 'Returned'],
  Retry: ['Picked_Up'],
  Delivered: [],
  Returned: [],
};

const getActor = async (tenantId, userId) => prisma.user.findFirst({
  where: { id: userId, tenant_id: tenantId, is_active: true },
  select: { id: true, role: true },
});

const getAll = async (tenantId, filters = {}) => {
  const where = { tenant_id: tenantId };
  if (filters.status) where.status = filters.status;
  if (filters.agent) where.assigned_agent_id = filters.agent;

  const cacheKey = `shipments:list:tenant:${tenantId}:status:${filters.status || 'all'}:agent:${filters.agent || 'all'}`;

  return getOrSetJSON(cacheKey, SHIPMENTS_LIST_CACHE_TTL_SECONDS, async () => prisma.shipment.findMany({
    where,
    include: {
      agent: { select: { id: true, name: true, email: true } },
      origin_hub: { select: { id: true, name: true, city: true } },
      destination_hub: { select: { id: true, name: true, city: true } },
      creator: { select: { id: true, name: true } },
      events: { orderBy: { created_at: 'desc' }, take: 1 },
    },
    orderBy: { created_at: 'desc' },
  }));
};

const getById = async (tenantId, id) => {
  const cacheKey = `shipments:detail:tenant:${tenantId}:id:${id}`;

  return getOrSetJSON(cacheKey, SHIPMENT_DETAIL_CACHE_TTL_SECONDS, async () => {
    const shipment = await prisma.shipment.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        agent: { select: { id: true, name: true, email: true } },
        origin_hub: { select: { id: true, name: true, city: true } },
        destination_hub: { select: { id: true, name: true, city: true } },
        creator: { select: { id: true, name: true } },
        events: { orderBy: { created_at: 'asc' } },
      },
    });

    if (!shipment) throw new Error('Shipment not found');
    return shipment;
  });
};

const create = async (tenantId, userId, data) => {
  const { sender_info, receiver_info, origin_hub_id, destination_hub_id, estimated_delivery } = data;
  
  // Validate emails before creating shipment
  validateSenderReceiverEmails(sender_info, receiver_info);
  
  const tracking_id = generateTrackingId();
  const qr_code = await generateQR(tracking_id, process.env.FRONTEND_URL);

  const shipment = await prisma.shipment.create({
    data: {
      tenant_id: tenantId,
      tracking_id,
      qr_code,
      created_by: userId,
      origin_hub_id: origin_hub_id || null,
      current_hub_id: origin_hub_id || null,
      destination_hub_id: destination_hub_id || null,
      sender_info,
      receiver_info,
      status: 'Created',
      estimated_delivery: estimated_delivery ? new Date(estimated_delivery) : null,
    },
  });

  await prisma.shipmentEvent.create({
    data: {
      tenant_id: tenantId,
      shipment_id: shipment.id,
      updated_by: userId,
      status: 'Created',
      location: origin_hub_id ? undefined : null,
      note: 'Shipment created',
    },
  });

  if (receiver_info?.email) {
    queueShipmentCreatedEmail({
      to: receiver_info.email,
      trackingId: tracking_id,
      frontendUrl: process.env.FRONTEND_URL,
    }).catch(() => {});
  }

  await invalidateShipmentCaches({ tenantId, trackingId: tracking_id });

  return shipment;
};

const assignAgent = async (tenantId, shipmentId, agentId) => {
  const shipment = await prisma.shipment.findFirst({ 
    where: { id: shipmentId, tenant_id: tenantId },
    include: { origin_hub: true, destination_hub: true }
  });
  if (!shipment) throw new Error('Shipment not found');
  
  const agent = await prisma.user.findFirst({ 
    where: { id: agentId, tenant_id: tenantId, role: 'agent' },
    include: { hub: true }
  });
  if (!agent) throw new Error('Agent not found in this tenant');
  
  // For delivery stage, check destination hub; for pickup stages, check origin hub
  if (shipment.status === 'Out_for_Delivery') {
    if (shipment.destination_hub_id && agent.hub_id !== shipment.destination_hub_id) {
      throw new Error(`Agent is from ${agent.hub?.name || 'another hub'}. Shipment destination is ${shipment.destination_hub?.name}. Agent must be from the delivery hub.`);
    }
  } else {
    // Pickup stage - check origin hub
    if (shipment.origin_hub_id && agent.hub_id !== shipment.origin_hub_id) {
      throw new Error(`Agent is from ${agent.hub?.name || 'another hub'}. Shipment is from ${shipment.origin_hub?.name}. Agent must be from the same hub as the shipment's origin location.`);
    }
  }
  
  const updated = await prisma.shipment.update({
    where: { id: shipmentId },
    data: { assigned_agent_id: agentId },
  });

  await invalidateShipmentCaches({ tenantId, trackingId: shipment.tracking_id });
  return updated;
};

const updateStatus = async (tenantId, shipmentId, userId, { status, location, note }) => {
  if (!VALID_STATUSES.includes(status)) throw new Error('Invalid status');

  const shipment = await prisma.shipment.findFirst({ 
    where: { id: shipmentId, tenant_id: tenantId },
    include: { origin_hub: true, destination_hub: true }
  });
  if (!shipment) throw new Error('Shipment not found');

  const actor = await getActor(tenantId, userId);
  if (!actor) throw new Error('User not found or inactive');

  if (actor.role === 'agent' && shipment.assigned_agent_id !== userId) {
    throw new Error('Forbidden: only the assigned agent can update this shipment');
  }

  const allowed = TRANSITIONS[shipment.status];
  if (!allowed || !allowed.includes(status)) {
    throw new Error(`Invalid transition from ${shipment.status} to ${status}. Allowed: ${allowed?.join(', ') || 'none'}`);
  }

  // Determine which hub the shipment is at based on the new status
  let updateData = { status };
  if (status === 'At_Sorting_Facility' || status === 'In_Transit') {
    updateData.current_hub_id = shipment.origin_hub_id;
  } else if (status === 'Out_for_Delivery') {
    updateData.current_hub_id = shipment.destination_hub_id;
  }

  const [updatedShipment] = await prisma.$transaction([
    prisma.shipment.update({ where: { id: shipmentId }, data: updateData }),
    prisma.shipmentEvent.create({
      data: { tenant_id: tenantId, shipment_id: shipmentId, updated_by: userId, status, location: location || null, note: note || null },
    }),
  ]);

  const receiverEmail = shipment.receiver_info?.email;
  if (receiverEmail) {
    queueStatusUpdateEmail({
      to: receiverEmail,
      trackingId: shipment.tracking_id,
      status,
      frontendUrl: process.env.FRONTEND_URL,
    }).catch(() => {});
  }

  await invalidateShipmentCaches({ tenantId, trackingId: shipment.tracking_id });

  return updatedShipment;
};

const getQR = async (tenantId, shipmentId) => {
  const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, tenant_id: tenantId } });
  if (!shipment) throw new Error('Shipment not found');
  if (!shipment.qr_code) {
    const qr = await generateQR(shipment.tracking_id, process.env.FRONTEND_URL);
    await prisma.shipment.update({ where: { id: shipmentId }, data: { qr_code: qr } });
    await invalidateShipmentCaches({ tenantId, trackingId: shipment.tracking_id });
    return qr;
  }
  return shipment.qr_code;
};

const uploadProof = async (tenantId, shipmentId, userId, imageUrl) => {
  const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, tenant_id: tenantId } });
  if (!shipment) throw new Error('Shipment not found');

  const actor = await getActor(tenantId, userId);
  if (!actor) throw new Error('User not found or inactive');

  if (actor.role === 'agent' && shipment.assigned_agent_id !== userId) {
    throw new Error('Forbidden: only the assigned agent can upload proof for this shipment');
  }

  const lastEvent = await prisma.shipmentEvent.findFirst({
    where: { shipment_id: shipmentId },
    orderBy: { created_at: 'desc' },
  });

  if (lastEvent) {
    const updatedEvent = await prisma.shipmentEvent.update({
      where: { id: lastEvent.id },
      data: { proof_image_url: imageUrl },
    });

    await invalidateShipmentCaches({ tenantId, trackingId: shipment.tracking_id });
    return updatedEvent;
  }

  const createdEvent = await prisma.shipmentEvent.create({
    data: { tenant_id: tenantId, shipment_id: shipmentId, updated_by: userId, status: shipment.status, proof_image_url: imageUrl, note: 'Proof of delivery uploaded' },
  });

  await invalidateShipmentCaches({ tenantId, trackingId: shipment.tracking_id });
  return createdEvent;
};

const getAgentShipments = async (tenantId, agentId) => {
  const cacheKey = `shipments:agent:list:tenant:${tenantId}:agent:${agentId}`;

  return getOrSetJSON(cacheKey, AGENT_WORKITEMS_CACHE_TTL_SECONDS, async () => prisma.shipment.findMany({
    where: { tenant_id: tenantId, assigned_agent_id: agentId },
    include: {
      origin_hub: { select: { name: true, city: true } },
      destination_hub: { select: { name: true, city: true } },
      events: { orderBy: { created_at: 'desc' }, take: 1 },
    },
    orderBy: { created_at: 'desc' },
  }));
};

const getAvailableAgents = async (tenantId, shipmentId) => {
  const cacheKey = `shipments:agents:available:tenant:${tenantId}:shipment:${shipmentId}`;

  return getOrSetJSON(cacheKey, AVAILABLE_AGENTS_CACHE_TTL_SECONDS, async () => {
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, tenant_id: tenantId },
    });
    if (!shipment) throw new Error('Shipment not found');

    // Delivery statuses: show agents from destination hub
    const deliveryStatuses = ['Out_for_Delivery', 'Retry', 'At_Sorting_Facility'];
    if (deliveryStatuses.includes(shipment.status)) {
      if (!shipment.destination_hub_id) {
        return prisma.user.findMany({
          where: { tenant_id: tenantId, role: 'agent', is_active: true },
          select: { id: true, name: true, email: true, hub_id: true, hub: { select: { name: true, city: true } } },
          orderBy: { name: 'asc' },
        });
      }

      return prisma.user.findMany({
        where: {
          tenant_id: tenantId,
          role: 'agent',
          is_active: true,
          hub_id: shipment.destination_hub_id,
        },
        select: { id: true, name: true, email: true, hub_id: true, hub: { select: { name: true, city: true } } },
        orderBy: { name: 'asc' },
      });
    }

    // Pickup statuses (Created, Picked_Up): show agents from origin hub
    if (!shipment.origin_hub_id) {
      return prisma.user.findMany({
        where: { tenant_id: tenantId, role: 'agent', is_active: true },
        select: { id: true, name: true, email: true, hub_id: true, hub: { select: { name: true, city: true } } },
        orderBy: { name: 'asc' },
      });
    }

    return prisma.user.findMany({
      where: {
        tenant_id: tenantId,
        role: 'agent',
        is_active: true,
        hub_id: shipment.origin_hub_id,
      },
      select: { id: true, name: true, email: true, hub_id: true, hub: { select: { name: true, city: true } } },
      orderBy: { name: 'asc' },
    });
  });
};

// Get agent workitems (task-focused view + history)
// Pickup agents see CREATED shipments at their hub + pickup history
// Delivery agents see OUT_FOR_DELIVERY shipments at their hub + delivery history
const getAgentWorkitems = async (tenantId, agentId) => {
  const cacheKey = `shipments:agent:workitems:tenant:${tenantId}:agent:${agentId}`;

  return getOrSetJSON(cacheKey, AGENT_WORKITEMS_CACHE_TTL_SECONDS, async () => {
    const agent = await prisma.user.findFirst({
      where: { id: agentId, tenant_id: tenantId, role: 'agent' },
      include: { hub: true },
    });
    if (!agent) throw new Error('Agent not found');
    if (!agent.hub_id) throw new Error('Agent must be assigned to a hub to view workitems');

    const [activePickupItems, pickupHistory, activeDeliveryItems, deliveryHistory] = await Promise.all([
      prisma.shipment.findMany({
        where: {
          tenant_id: tenantId,
          origin_hub_id: agent.hub_id,
          status: { in: ['Created', 'Picked_Up'] },
        },
        include: {
          origin_hub: { select: { name: true, city: true } },
          destination_hub: { select: { name: true, city: true } },
          creator: { select: { name: true } },
          agent: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.shipment.findMany({
        where: {
          tenant_id: tenantId,
          origin_hub_id: agent.hub_id,
          assigned_agent_id: agentId,
          status: { notIn: ['Created', 'Picked_Up'] },
        },
        include: {
          origin_hub: { select: { name: true, city: true } },
          destination_hub: { select: { name: true, city: true } },
          creator: { select: { name: true } },
          agent: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.shipment.findMany({
        where: {
          tenant_id: tenantId,
          destination_hub_id: agent.hub_id,
          status: 'Out_for_Delivery',
        },
        include: {
          origin_hub: { select: { name: true, city: true } },
          destination_hub: { select: { name: true, city: true } },
          agent: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.shipment.findMany({
        where: {
          tenant_id: tenantId,
          destination_hub_id: agent.hub_id,
          assigned_agent_id: agentId,
          status: { notIn: ['Out_for_Delivery'] },
        },
        include: {
          origin_hub: { select: { name: true, city: true } },
          destination_hub: { select: { name: true, city: true } },
          agent: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const allPickup = [...activePickupItems, ...pickupHistory];
    const allDelivery = [...activeDeliveryItems, ...deliveryHistory];

    return {
      pickup: allPickup.map((shipment) => ({
        ...shipment,
        stage: 'PICKUP',
        isCompleted: !['Created', 'Picked_Up'].includes(shipment.status),
      })),
      delivery: allDelivery.map((shipment) => ({
        ...shipment,
        stage: 'DELIVERY',
        isCompleted: shipment.status !== 'Out_for_Delivery',
      })),
      total: allPickup.length + allDelivery.length,
    };
  });
};

// Transition shipment through stages (auto/admin triggered)
// From: At_Sorting_Facility → To: In_Transit
// From: In_Transit → To: At_Destination_Hub (system auto-assigns delivery agent)
const transitionStage = async (tenantId, shipmentId, userId) => {
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, tenant_id: tenantId },
    include: { destination_hub: true }
  });
  if (!shipment) throw new Error('Shipment not found');

  // Define automatic transitions
  let nextStatus = null;
  if (shipment.status === 'At_Sorting_Facility') {
    nextStatus = 'In_Transit';
  } else if (shipment.status === 'In_Transit') {
    nextStatus = 'Out_for_Delivery';
  }

  if (!nextStatus) {
    throw new Error(`Cannot auto-transition from ${shipment.status}`);
  }

  const updateData = { status: nextStatus };
  
  // If transitioning to delivery stage, unassign the pickup agent
  if (nextStatus === 'Out_for_Delivery') {
    updateData.assigned_agent_id = null;
    updateData.current_hub_id = shipment.destination_hub_id;
  }

  const updated = await prisma.shipment.update({
    where: { id: shipmentId },
    data: updateData,
    include: { destination_hub: { select: { name: true, city: true } } }
  });

  await prisma.shipmentEvent.create({
    data: {
      tenant_id: tenantId,
      shipment_id: shipmentId,
      updated_by: userId,
      status: nextStatus,
      note: `Shipment transitioned to ${nextStatus}`
    }
  });

  await invalidateShipmentCaches({ tenantId, trackingId: shipment.tracking_id });

  return updated;
};

module.exports = { getAll, getById, create, assignAgent, updateStatus, getQR, uploadProof, getAgentShipments, getAvailableAgents, getAgentWorkitems, transitionStage, TRANSITIONS };
