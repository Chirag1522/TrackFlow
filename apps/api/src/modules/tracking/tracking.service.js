const prisma = require('../../config/db');
const { invalidateShipmentCaches } = require('../../utils/cacheInvalidation');

const makeError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getUniqueShipmentByTrackingId = async (tracking_id, include = {}) => {
  const shipments = await prisma.shipment.findMany({
    where: { tracking_id },
    include,
    take: 2,
    orderBy: { created_at: 'desc' },
  });

  if (shipments.length === 0) {
    throw makeError('Shipment not found', 404);
  }

  if (shipments.length > 1) {
    throw makeError('Tracking ID is ambiguous. Please contact support.', 409);
  }

  return shipments[0];
};

const trackByTrackingId = async (tracking_id) => {
  const shipment = await getUniqueShipmentByTrackingId(tracking_id, {
    origin_hub: { select: { name: true, city: true } },
    destination_hub: { select: { name: true, city: true } },
    events: { orderBy: { created_at: 'asc' } },
  });

  const gpsHistory = await prisma.gpsTracking.findMany({
    where: {
      shipment_id: shipment.id,
      tenant_id: shipment.tenant_id,
    },
    orderBy: { created_at: 'asc' },
    take: 120,
  });

  const latestGps = gpsHistory.length > 0 ? gpsHistory[gpsHistory.length - 1] : null;

  // Map-based shipments store their coordinates in sender_info / receiver_info.
  const originLatitude = toFiniteNumber(shipment.sender_info?.latitude ?? shipment.sender_info?.lat);
  const originLongitude = toFiniteNumber(
    shipment.sender_info?.longitude ?? shipment.sender_info?.lng ?? shipment.sender_info?.lon,
  );
  const destinationLatitude = toFiniteNumber(shipment.receiver_info?.latitude ?? shipment.receiver_info?.lat);
  const destinationLongitude = toFiniteNumber(
    shipment.receiver_info?.longitude ?? shipment.receiver_info?.lng ?? shipment.receiver_info?.lon,
  );

  return {
    tracking_id: shipment.tracking_id,
    status: shipment.status,
    estimated_delivery: shipment.estimated_delivery,
    created_at: shipment.created_at,
    origin_hub: {
      ...(shipment.origin_hub || {}),
      latitude: originLatitude,
      longitude: originLongitude,
    },
    destination_hub: {
      ...(shipment.destination_hub || {}),
      latitude: destinationLatitude,
      longitude: destinationLongitude,
    },
    sender: {
      name: shipment.sender_info?.name,
      city: shipment.sender_info?.city,
      address: shipment.sender_info?.address,
      latitude: originLatitude,
      longitude: originLongitude,
    },
    receiver: {
      name: shipment.receiver_info?.name,
      city: shipment.receiver_info?.city,
      address: shipment.receiver_info?.address,
      latitude: destinationLatitude,
      longitude: destinationLongitude,
    },
    events: shipment.events.map((event) => ({
      id: event.id,
      status: event.status,
      location: event.location,
      note: event.note,
      proof_image_url: event.proof_image_url,
      created_at: event.created_at,
    })),
    gps: {
      current_location: latestGps
        ? {
            latitude: latestGps.latitude,
            longitude: latestGps.longitude,
            accuracy_meters: latestGps.accuracy_meters,
            speed_kmh: latestGps.speed_kmh,
            heading: latestGps.heading,
            timestamp: latestGps.created_at,
          }
        : null,
      location_history: gpsHistory.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy_meters: point.accuracy_meters,
        speed_kmh: point.speed_kmh,
        heading: point.heading,
        timestamp: point.created_at,
      })),
    },
  };
};

const requestReturn = async (tracking_id, actor) => {
  if (!actor?.userId) {
    throw makeError('Unauthorized', 401);
  }

  const shipment = await getUniqueShipmentByTrackingId(tracking_id);

  if (actor.role !== 'super_admin' && actor.tenantId && actor.tenantId !== shipment.tenant_id) {
    throw makeError('Forbidden: shipment does not belong to your tenant', 403);
  }

  if (actor.role === 'customer') {
    const customer = await prisma.user.findFirst({
      where: { id: actor.userId, tenant_id: shipment.tenant_id, role: 'customer', is_active: true },
      select: { email: true },
    });

    if (!customer) {
      throw makeError('Forbidden', 403);
    }

    const actorEmail = customer.email?.toLowerCase();
    const senderEmail = shipment.sender_info?.email?.toLowerCase();
    const receiverEmail = shipment.receiver_info?.email?.toLowerCase();

    if (!actorEmail || (actorEmail !== senderEmail && actorEmail !== receiverEmail)) {
      throw makeError('Customers can request return only for their own shipments', 403);
    }
  }

  if (shipment.status !== 'Failed') {
    throw makeError('Only failed shipments can be returned', 400);
  }

  const [updated] = await prisma.$transaction([
    prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: 'Returned' },
    }),
    prisma.shipmentEvent.create({
      data: {
        tenant_id: shipment.tenant_id,
        shipment_id: shipment.id,
        updated_by: actor.userId,
        status: 'Returned',
        location: 'Returning to sender',
        note: `Return requested by ${actor.role}`,
      },
    }),
  ]);

  await invalidateShipmentCaches({ tenantId: shipment.tenant_id, trackingId: shipment.tracking_id });

  return {
    tracking_id: updated.tracking_id,
    status: updated.status,
    message: 'Return request submitted',
    sender_email: shipment.sender_info?.email || null,
  };
};

module.exports = { trackByTrackingId, requestReturn };
