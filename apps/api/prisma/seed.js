const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create subscription plans
  const basicPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-basic-001' },
    update: {},
    create: {
      id: 'plan-basic-001',
      name: 'Basic',
      price: 29.99,
      max_shipments: 500,
      max_agents: 5,
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-pro-001' },
    update: {},
    create: {
      id: 'plan-pro-001',
      name: 'Professional',
      price: 99.99,
      max_shipments: 5000,
      max_agents: 50,
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-enterprise-001' },
    update: {},
    create: {
      id: 'plan-enterprise-001',
      name: 'Enterprise',
      price: 299.99,
      max_shipments: 999999,
      max_agents: 999,
    },
  });

  // Create super admin (no tenant)
  const superAdminPassword = await bcrypt.hash('superadmin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { id: 'user-superadmin-001' },
    update: {},
    create: {
      id: 'user-superadmin-001',
      tenant_id: null,
      name: 'Super Admin',
      email: 'superadmin@courier.com',
      password_hash: superAdminPassword,
      role: 'super_admin',
    },
  });

  // Create demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo-courier' },
    update: {},
    create: {
      name: 'Demo Courier Co.',
      slug: 'demo-courier',
      plan_id: proPlan.id,
      plan_valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
  });

  // Create hub for demo tenant
  const demoHub = await prisma.hub.create({
    data: {
      tenant_id: demoTenant.id,
      name: 'Mumbai Central Hub',
      city: 'Mumbai',
      address: '123 Courier Lane, Andheri East, Mumbai 400069',
    },
  });

  // Create admin for demo tenant
  const adminPassword = await bcrypt.hash('admin123', 12);
  const demoAdmin = await prisma.user.upsert({
    where: { id: 'user-demoadmin-001' },
    update: {},
    create: {
      id: 'user-demoadmin-001',
      tenant_id: demoTenant.id,
      name: 'Demo Admin',
      email: 'admin@democourier.com',
      password_hash: adminPassword,
      role: 'admin',
    },
  });

  // Create agent for demo tenant
  const agentPassword = await bcrypt.hash('agent123', 12);
  const demoAgent = await prisma.user.upsert({
    where: { id: 'user-demoagent-001' },
    update: {},
    create: {
      id: 'user-demoagent-001',
      tenant_id: demoTenant.id,
      name: 'Demo Agent',
      email: 'agent@democourier.com',
      password_hash: agentPassword,
      role: 'agent',
      hub_id: demoHub.id,
    },
  });

  console.log('✅ Seed completed!');
  console.log('');
  console.log('Login credentials:');
  console.log('Super Admin: superadmin@courier.com / superadmin123');
  console.log('Admin:       admin@democourier.com / admin123');
  console.log('Agent:       agent@democourier.com / agent123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
