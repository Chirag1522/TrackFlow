const prisma = require('../../config/db');
const bcrypt = require('bcryptjs');

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
  const { name, slug, plan_id, plan_valid_until, status, admin_name, admin_email, admin_password } = data;
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) throw new Error('Slug already in use');

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name,
        slug,
        plan_id,
        plan_valid_until: plan_valid_until ? new Date(plan_valid_until) : null,
        status: status || 'active',
      },
      include: { plan: true },
    });

    const normalizedAdminEmail = admin_email.trim().toLowerCase();
    const adminExists = await tx.user.findFirst({ where: { tenant_id: tenant.id, email: normalizedAdminEmail } });
    if (adminExists) throw new Error('Admin email already exists for this tenant');

    const password_hash = await bcrypt.hash(admin_password, 12);
    const initial_admin = await tx.user.create({
      data: {
        tenant_id: tenant.id,
        name: admin_name,
        email: normalizedAdminEmail,
        password_hash,
        role: 'admin',
        is_active: true,
      },
      select: { id: true, name: true, email: true, role: true, is_active: true, created_at: true },
    });

    return { ...tenant, initial_admin };
  });
};

const createTenantAdmin = async (tenantId, data) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Tenant not found');

  const normalizedEmail = data.email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({ where: { tenant_id: tenantId, email: normalizedEmail } });
  if (existing) throw new Error('Email already exists for this tenant');

  const password_hash = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: {
      tenant_id: tenantId,
      name: data.name,
      email: normalizedEmail,
      password_hash,
      role: 'admin',
      is_active: true,
    },
    select: { id: true, name: true, email: true, role: true, is_active: true, created_at: true },
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

module.exports = { getAll, getById, create, update, remove, createTenantAdmin };
