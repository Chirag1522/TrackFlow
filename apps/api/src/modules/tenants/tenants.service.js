const prisma = require('../../config/db');

const getAll = async () => {
  return prisma.tenant.findMany({
    include: { plan: true, _count: { select: { users: true, shipments: true } } },
    orderBy: { created_at: 'desc' },
  });
};

const getById = async (id) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { plan: true },
  });
  if (!tenant) throw new Error('Tenant not found');
  return tenant;
};

const create = async (data) => {
  const { name, slug, plan_id, plan_valid_until } = data;
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) throw new Error('Slug already in use');
  return prisma.tenant.create({
    data: { name, slug, plan_id, plan_valid_until: plan_valid_until ? new Date(plan_valid_until) : null, status: 'active' },
    include: { plan: true },
  });
};

const update = async (id, data) => {
  await getById(id);
  const { name, slug, plan_id, plan_valid_until, status } = data;
  return prisma.tenant.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(slug && { slug }),
      ...(plan_id !== undefined && { plan_id }),
      ...(plan_valid_until && { plan_valid_until: new Date(plan_valid_until) }),
      ...(status && { status }),
    },
    include: { plan: true },
  });
};

const remove = async (id) => {
  await getById(id);
  return prisma.tenant.delete({ where: { id } });
};

module.exports = { getAll, getById, create, update, remove };
