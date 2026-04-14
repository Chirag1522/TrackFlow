const prisma = require('../../config/db');
const { getOrSetJSON } = require('../../utils/cache');

const getTtl = (envValue, fallback) => {
  const parsed = Number(envValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ANALYTICS_TTL_SECONDS = getTtl(process.env.CACHE_ANALYTICS_TTL_SECONDS, 60);

const getSummary = async (tenantId) => {
  const cacheKey = `analytics:tenant:${tenantId}:summary`;

  return getOrSetJSON(cacheKey, ANALYTICS_TTL_SECONDS, async () => {
    const [total, delivered, failed, pending] = await Promise.all([
      prisma.shipment.count({ where: { tenant_id: tenantId } }),
      prisma.shipment.count({ where: { tenant_id: tenantId, status: 'Delivered' } }),
      prisma.shipment.count({ where: { tenant_id: tenantId, status: 'Failed' } }),
      prisma.shipment.count({ where: { tenant_id: tenantId, status: { notIn: ['Delivered', 'Failed', 'Returned'] } } }),
    ]);

    return { total, delivered, failed, pending };
  });
};

const getByStatus = async (tenantId) => {
  const cacheKey = `analytics:tenant:${tenantId}:by-status`;

  return getOrSetJSON(cacheKey, ANALYTICS_TTL_SECONDS, async () => {
    const results = await prisma.shipment.groupBy({
      by: ['status'],
      where: { tenant_id: tenantId },
      _count: { status: true },
    });

    return results.map((result) => ({
      status: result.status,
      count: result._count.status,
    }));
  });
};

const getAgentPerformance = async (tenantId) => {
  const cacheKey = `analytics:tenant:${tenantId}:agent-performance`;

  return getOrSetJSON(cacheKey, ANALYTICS_TTL_SECONDS, async () => {
    const [agents, groupedShipments] = await Promise.all([
      prisma.user.findMany({
        where: { tenant_id: tenantId, role: 'agent' },
        select: { id: true, name: true },
      }),
      prisma.shipment.groupBy({
        by: ['assigned_agent_id', 'status'],
        where: {
          tenant_id: tenantId,
          assigned_agent_id: { not: null },
        },
        _count: { _all: true },
      }),
    ]);

    const statsByAgent = groupedShipments.reduce((acc, row) => {
      if (!row.assigned_agent_id) return acc;

      if (!acc[row.assigned_agent_id]) {
        acc[row.assigned_agent_id] = { delivered: 0, failed: 0, total: 0 };
      }

      acc[row.assigned_agent_id].total += row._count._all;
      if (row.status === 'Delivered') acc[row.assigned_agent_id].delivered += row._count._all;
      if (row.status === 'Failed') acc[row.assigned_agent_id].failed += row._count._all;

      return acc;
    }, {});

    return agents.map((agent) => {
      const stats = statsByAgent[agent.id] || { delivered: 0, failed: 0, total: 0 };
      return {
        agent_id: agent.id,
        agent_name: agent.name,
        delivered: stats.delivered,
        failed: stats.failed,
        total: stats.total,
      };
    });
  });
};

module.exports = { getSummary, getByStatus, getAgentPerformance };
