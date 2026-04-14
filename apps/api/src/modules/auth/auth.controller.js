const authService = require('./auth.service');
const { helpers } = require('../../utils/auditLog');
const { recordFailedLogin, resetLoginAttempts } = require('../../middleware/security');

const login = async (req, res) => {
  try {
    const { email, password, tenant_slug } = req.body;
    const result = await authService.login({ email, password, tenant_slug });
    
    // Log successful login
    helpers.logLogin(result.user.id, result.user.tenantId, req.auditIp, req.auditUserAgent, true);
    
    // Reset brute force attempts for this IP
    resetLoginAttempts(req);
    
    res.json(result);
  } catch (err) {
    // Log failed login attempt
    helpers.logLogin(null, null, req.auditIp, req.auditUserAgent, false);
    
    // Record failed attempt for brute force detection
    recordFailedLogin(req);
    
    res.status(401).json({ error: err.message });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const tokens = await authService.refresh(refreshToken);
    
    // Log token refresh
    helpers.auditLog({
      action: 'user.token.refresh',
      resource: 'auth',
      userId: tokens.user?.id,
      tenantId: tokens.user?.tenantId,
      ipAddress: req.auditIp,
      userAgent: req.auditUserAgent,
      status: 'success',
    });
    
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

const logout = async (req, res) => {
  // Log logout
  if (req.user) {
    helpers.auditLog({
      action: 'user.logout',
      resource: 'auth',
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      ipAddress: req.auditIp,
      userAgent: req.auditUserAgent,
      status: 'success',
    });
  }
  
  res.json({ message: 'Logged out successfully' });
};

module.exports = { login, refresh, logout };
