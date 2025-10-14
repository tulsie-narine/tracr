const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'this_is_a_very_secure_jwt_secret_key_for_development_only_32chars';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Mock data
const mockUsers = [
  { id: '1', username: 'admin', email: 'admin@tracr.local', role: 'admin', created_at: new Date().toISOString() },
  { id: '2', username: 'user1', email: 'user1@tracr.local', role: 'viewer', created_at: new Date().toISOString() }
];

const mockDevices = [
  { id: '1', hostname: 'WS001', status: 'online', last_seen: new Date().toISOString() },
  { id: '2', hostname: 'WS002', status: 'offline', last_seen: new Date(Date.now() - 3600000).toISOString() }
];

const mockAuditLogs = [
  { id: '1', user: 'admin', action: 'login', timestamp: new Date().toISOString(), details: 'User logged in successfully' }
];

export default async function handler(req, res) {
  // Handle CORS
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  const fullPath = Array.isArray(path) ? path.join('/') : path || '';

  try {
    // Health check
    if (fullPath === 'health') {
      return res.status(200).json({ status: 'ok' });
    }

    // Login endpoint
    if (fullPath === 'v1/auth/login' && req.method === 'POST') {
      const { username, password } = req.body;
      
      if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign({
          sub: '123e4567-e89b-12d3-a456-426614174000',
          username: 'admin',
          email: 'admin@tracr.local',
          role: 'admin',
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        }, JWT_SECRET);

        return res.status(200).json({
          token,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Protected endpoints
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    // Users endpoint
    if (fullPath === 'v1/users' && req.method === 'GET') {
      return res.status(200).json({
        users: mockUsers,
        total: mockUsers.length,
        page: 1,
        per_page: 20
      });
    }

    // Devices endpoint  
    if (fullPath === 'v1/devices' && req.method === 'GET') {
      return res.status(200).json({
        devices: mockDevices,
        total: mockDevices.length,
        page: 1,
        per_page: 20
      });
    }

    // Audit logs endpoint
    if (fullPath === 'v1/audit-logs' && req.method === 'GET') {
      return res.status(200).json({
        audit_logs: mockAuditLogs,
        total: mockAuditLogs.length,
        page: 1,
        per_page: 20
      });
    }

    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}