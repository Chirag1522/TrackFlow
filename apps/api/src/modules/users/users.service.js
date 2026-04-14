const bcrypt = require('bcryptjs');
const prisma = require('../../config/db');
const { queueAgentCredentialsEmail } = require('../../jobs/emailJobs');

const getAll = async (tenantId) => {
  return prisma.user.findMany({
    where: { tenant_id: tenantId },
    select: { id: true, name: true, email: true, role: true, hub_id: true, is_active: true, created_at: true, hub: { select: { name: true, city: true } } },
    orderBy: { created_at: 'desc' },
  });
};

const create = async (tenantId, data) => {
  const { name, email, password, role, hub_id } = data;
  const existing = await prisma.user.findFirst({ where: { tenant_id: tenantId, email } });
  if (existing) throw new Error('Email already exists for this tenant');
  
  // Check agent limit if creating an agent
  if (role === 'agent') {
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId },
      include: { plan: true }
    });
    if (!tenant) throw new Error('Tenant not found');
    if (!tenant.plan) throw new Error('No subscription plan assigned to this tenant');
    
    const agentCount = await prisma.user.count({
      where: { tenant_id: tenantId, role: 'agent', is_active: true }
    });
    
    if (agentCount >= tenant.plan.max_agents) {
      throw new Error(`Cannot create more agents. Plan limit: ${tenant.plan.max_agents}, Current: ${agentCount}`);
    }
  }
  
  const password_hash = await bcrypt.hash(password, 12);
  const newUser = await prisma.user.create({
    data: { name, email, password_hash, role, hub_id: hub_id || null, tenant_id: tenantId, is_active: true },
    select: { id: true, name: true, email: true, role: true, hub_id: true, is_active: true, created_at: true },
  });
  
  // Send credentials email to agent
  if (role === 'agent') {
    queueAgentCredentialsEmail({
      to: email,
      agentName: name,
      email: email,
      password: password,
      frontendUrl: process.env.FRONTEND_URL,
    }).catch((err) => {
      console.error('Failed to queue agent credentials email:', err.message);
    });
  }
  
  return newUser;
};

const update = async (tenantId, id, data) => {
  const user = await prisma.user.findFirst({ where: { id, tenant_id: tenantId } });
  if (!user) throw new Error('User not found');
  const { name, hub_id, is_active, password } = data;
  const updateData = {};
  if (name) updateData.name = name;
  if (hub_id !== undefined) updateData.hub_id = hub_id;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (password) updateData.password_hash = await bcrypt.hash(password, 12);
  return prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, hub_id: true, is_active: true },
  });
};

const remove = async (tenantId, id) => {
  const user = await prisma.user.findFirst({ where: { id, tenant_id: tenantId } });
  if (!user) throw new Error('User not found');
  return prisma.user.update({ where: { id }, data: { is_active: false } });
};

module.exports = { getAll, create, update, remove };
