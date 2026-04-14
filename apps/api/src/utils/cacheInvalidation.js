const { deleteByPattern, deleteKeys } = require('./cache');

const invalidateShipmentCaches = async ({ tenantId, trackingId }) => {
  try {
    const tasks = [];

    if (tenantId) {
      tasks.push(deleteByPattern(`analytics:tenant:${tenantId}:*`));
      tasks.push(deleteByPattern(`shipments:list:tenant:${tenantId}:*`));
      tasks.push(deleteByPattern(`shipments:detail:tenant:${tenantId}:*`));
      tasks.push(deleteByPattern(`shipments:agent:list:tenant:${tenantId}:*`));
      tasks.push(deleteByPattern(`shipments:agent:workitems:tenant:${tenantId}:*`));
      tasks.push(deleteByPattern(`shipments:agents:available:tenant:${tenantId}:*`));
    }

    if (trackingId) {
      tasks.push(deleteKeys(`tracking:public:${trackingId}`));
    }

    await Promise.all(tasks);
  } catch (error) {
    console.error('Cache invalidation failed:', error.message);
  }
};

module.exports = {
  invalidateShipmentCaches,
};
