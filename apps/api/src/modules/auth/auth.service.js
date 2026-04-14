const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const env = require('../../config/env');

const signAccessToken = (payload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

const signRefreshToken = (payload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });

const resolveLoginUser = async ({ email, password, tenant_slug }) => {
  const where = tenant_slug
    ? { email, tenant: { is: { slug: tenant_slug } } }
    : { email };

  const users = await prisma.user.findMany({
    where,
    include: { tenant: true },
    take: 20,
  });

  if (users.length === 0) throw new Error('Invalid credentials');

  const passwordMatchedUsers = [];

  for (const candidate of users) {
    // Compare against all matching-email candidates to avoid tenant mix-ups.
    if (await bcrypt.compare(password, candidate.password_hash)) {
      passwordMatchedUsers.push(candidate);
    }
  }

  if (passwordMatchedUsers.length === 0) throw new Error('Invalid credentials');

  if (passwordMatchedUsers.length > 1) {
    throw new Error('Multiple accounts match these credentials. Please provide tenant_slug.');
  }

  return passwordMatchedUsers[0];
};

const login = async ({ email, password, tenant_slug }) => {
  const user = await resolveLoginUser({ email, password, tenant_slug });
  if (!user.is_active) throw new Error('Account is deactivated');

  if (user.role !== 'super_admin' && user.tenant?.status !== 'active') {
    throw new Error('Tenant account is inactive');
  }

  const payload = {
    userId: user.id,
    role: user.role,
    tenantId: user.tenant_id || null,
    hubId: user.hub_id || null,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      hubId: user.hub_id,
    },
  };
};

const refresh = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    throw new Error('Invalid refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || !user.is_active) throw new Error('User not found or inactive');

  const payload = {
    userId: user.id,
    role: user.role,
    tenantId: user.tenant_id || null,
    hubId: user.hub_id || null,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return { accessToken, refreshToken };
};

module.exports = { login, refresh };
