const prisma = require('../../config/db');

const getAll = async (tenantId) => {
  return prisma.hub.findMany({
    where: { tenant_id: tenantId },
    include: { _count: { select: { users: true, origin_shipments: true } } },
    orderBy: { created_at: 'desc' },
  });
};

const create = async (tenantId, data) => {
  const { name, city, address } = data;
  return prisma.hub.create({ data: { name, city, address, tenant_id: tenantId } });
};

const update = async (tenantId, id, data) => {
  const hub = await prisma.hub.findFirst({ where: { id, tenant_id: tenantId } });
  if (!hub) throw new Error('Hub not found');
  const { name, city, address } = data;
  return prisma.hub.update({ where: { id }, data: { ...(name && { name }), ...(city && { city }), ...(address && { address }) } });
};

const remove = async (tenantId, id) => {
  const hub = await prisma.hub.findFirst({ where: { id, tenant_id: tenantId } });
  if (!hub) throw new Error('Hub not found');
  return prisma.hub.delete({ where: { id } });
};

module.exports = { getAll, create, update, remove };
