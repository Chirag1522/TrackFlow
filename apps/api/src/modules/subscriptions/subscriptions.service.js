const prisma = require('../../config/db');

const getAll = async () => {
  return prisma.subscriptionPlan.findMany({ orderBy: { price: 'asc' } });
};

const create = async (data) => {
  const { name, price, max_shipments, max_agents } = data;
  return prisma.subscriptionPlan.create({
    data: { name, price: parseFloat(price), max_shipments: parseInt(max_shipments), max_agents: parseInt(max_agents) },
  });
};

const update = async (id, data) => {
  const { name, price, max_shipments, max_agents } = data;
  return prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(max_shipments !== undefined && { max_shipments: parseInt(max_shipments) }),
      ...(max_agents !== undefined && { max_agents: parseInt(max_agents) }),
    },
  });
};

module.exports = { getAll, create, update };
