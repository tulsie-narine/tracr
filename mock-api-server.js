const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'this_is_a_very_secure_jwt_secret_key_for_development_only_32chars';

app.use(cors());
app.use(express.json());

// In-memory storage for registered devices
const registeredDevices = new Map();

// Clear all devices on startup for clean testing
registeredDevices.clear();

// Mock login endpoint
app.post('/v1/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Mock authentication - only accept admin/admin123
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign(
      { 
        sub: '123e4567-e89b-12d3-a456-426614174000',
        username: 'admin',
        role: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'admin',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({
      error: 'Invalid credentials'
    });
  }
});

// Mock health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mock agent registration endpoint
app.post('/v1/agents/register', (req, res) => {
  const { hostname, os_version, agent_version } = req.body;
  
  console.log(`[REGISTER] New agent registration: ${hostname} (${os_version}) - Agent v${agent_version}`);
  
  // Check if device already exists by hostname
  let existingDevice = null;
  for (const [id, device] of registeredDevices) {
    if (device.hostname === hostname) {
      existingDevice = { id, ...device };
      break;
    }
  }
  
  let deviceId, deviceToken;
  
  if (existingDevice) {
    // Return existing device
    deviceId = existingDevice.id;
    deviceToken = existingDevice.device_token;
    console.log(`[REGISTER] Returning existing device: ${deviceId} for ${hostname}`);
    
    // Update last_seen
    registeredDevices.set(deviceId, {
      ...existingDevice,
      last_seen: new Date().toISOString(),
      is_online: true
    });
  } else {
    // Generate a new device ID and token
    deviceId = uuidv4();
    deviceToken = `token-${Math.random().toString(36).substring(2, 32)}`;
    
    // Store the device
    registeredDevices.set(deviceId, {
      hostname,
      os_caption: os_version,
      agent_version,
      device_token: deviceToken,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      status: 'active',
      is_online: true,
      inventory_data: null
    });
    
    console.log(`[REGISTER] Created new device: ${deviceId} for ${hostname}`);
  }
  
  res.json({
    device_id: deviceId,
    device_token: deviceToken
  });
});

// Mock agent inventory endpoint
app.post('/v1/agents/:deviceId/inventory', (req, res) => {
  const { deviceId } = req.params;
  console.log(`[INVENTORY] Received inventory from device: ${deviceId}`);
  console.log('Inventory data:', JSON.stringify(req.body, null, 2));
  
  // Update device with inventory data
  if (registeredDevices.has(deviceId)) {
    const device = registeredDevices.get(deviceId);
    registeredDevices.set(deviceId, {
      ...device,
      inventory_data: req.body,
      last_seen: new Date().toISOString(),
      is_online: true
    });
    console.log(`[INVENTORY] Updated device ${deviceId} with inventory data`);
  } else {
    console.log(`[INVENTORY] Warning: Device ${deviceId} not found in registry`);
  }
  
  res.json({ success: true });
});

// Mock agent heartbeat endpoint
app.post('/v1/agents/:deviceId/heartbeat', (req, res) => {
  const { deviceId } = req.params;
  console.log(`[HEARTBEAT] Received heartbeat from device: ${deviceId}`);
  
  // Update device heartbeat
  if (registeredDevices.has(deviceId)) {
    const device = registeredDevices.get(deviceId);
    registeredDevices.set(deviceId, {
      ...device,
      last_seen: new Date().toISOString(),
      is_online: true
    });
  }
  
  res.json({ success: true });
});

// Mock devices stats
app.get('/v1/devices/stats', (req, res) => {
  const devices = Array.from(registeredDevices.values());
  const now = new Date();
  
  let online = 0;
  let offline = 0;
  
  devices.forEach(device => {
    const lastSeen = new Date(device.last_seen);
    const minutesSinceLastSeen = (now - lastSeen) / (1000 * 60);
    
    if (minutesSinceLastSeen < 10) { // Consider online if seen in last 10 minutes
      online++;
    } else {
      offline++;
    }
  });
  
  res.json({
    total: devices.length,
    online: online,
    offline: offline,
    error: 0
  });
});

// Mock devices list
app.get('/v1/devices', (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '20');
  const search = req.query.search || '';
  const status = req.query.status || '';
  
  let devices = Array.from(registeredDevices.entries()).map(([id, device]) => {
    const now = new Date();
    const lastSeen = new Date(device.last_seen);
    const minutesSinceLastSeen = (now - lastSeen) / (1000 * 60);
    const is_online = minutesSinceLastSeen < 10; // Consider online if seen in last 10 minutes
    
    return {
      id,
      hostname: device.hostname,
      os_caption: device.os_caption,
      status: device.status,
      last_seen: device.last_seen,
      is_online,
      agent_version: device.agent_version,
      first_seen: device.first_seen
    };
  });
  
  // Apply search filter
  if (search) {
    devices = devices.filter(device => 
      device.hostname.toLowerCase().includes(search.toLowerCase()) ||
      device.os_caption.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // Apply status filter
  if (status) {
    devices = devices.filter(device => device.status === status);
  }
  
  // Sort by last_seen descending
  devices.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));
  
  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedDevices = devices.slice(startIndex, endIndex);
  
  res.json({
    data: paginatedDevices,
    pagination: {
      total: devices.length,
      page: page,
      limit: limit,
      total_pages: Math.ceil(devices.length / limit)
    }
  });
});

// Mock device detail
app.get('/v1/devices/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  
  if (!registeredDevices.has(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  const device = registeredDevices.get(deviceId);
  const now = new Date();
  const lastSeen = new Date(device.last_seen);
  const minutesSinceLastSeen = (now - lastSeen) / (1000 * 60);
  const is_online = minutesSinceLastSeen < 10;
  
  res.json({
    id: deviceId,
    hostname: device.hostname,
    os_caption: device.os_caption,
    status: device.status,
    last_seen: device.last_seen,
    is_online,
    agent_version: device.agent_version,
    first_seen: device.first_seen,
    inventory_data: device.inventory_data
  });
});

// Mock clear all devices (for testing)
app.delete('/v1/devices', (req, res) => {
  const deviceCount = registeredDevices.size;
  registeredDevices.clear();
  res.json({ success: true, message: `Cleared ${deviceCount} devices` });
});

// Mock delete device
app.delete('/v1/devices/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  
  if (!registeredDevices.has(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  registeredDevices.delete(deviceId);
  res.json({ success: true, message: `Device ${deviceId} deleted` });
});

// Mock users list
app.get('/v1/users', (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '50');
  
  const users = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'admin',
      role: 'admin',
      created_at: new Date('2024-01-01').toISOString(),
      updated_at: new Date('2024-01-15').toISOString()
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174001', 
      username: 'viewer1',
      role: 'viewer',
      created_at: new Date('2024-02-01').toISOString(),
      updated_at: new Date('2024-02-01').toISOString()
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      username: 'manager',
      role: 'admin',
      created_at: new Date('2024-03-01').toISOString(),
      updated_at: new Date('2024-03-10').toISOString()
    }
  ];

  res.json({
    users,
    pagination: {
      total: users.length,
      page,
      limit,
      total_pages: Math.ceil(users.length / limit)
    }
  });
});

// Mock create user
app.post('/v1/users', (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Simulate username already exists
  if (username === 'admin') {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const newUser = {
    id: 'new-user-id-' + Date.now(),
    username,
    role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  res.status(201).json(newUser);
});

// Mock update user
app.put('/v1/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { password, role } = req.body;

  const updatedUser = {
    id: userId,
    username: 'updated-user',
    role: role || 'viewer',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString()
  };

  res.json(updatedUser);
});

// Mock delete user
app.delete('/v1/users/:userId', (req, res) => {
  const { userId } = req.params;
  
  // Simulate "last admin" protection
  if (userId === 'last-admin-id') {
    return res.status(400).json({ error: 'Cannot delete the last admin user' });
  }

  res.status(204).send();
});

// Mock audit logs
app.get('/v1/audit-logs', (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '50');
  const action = req.query.action;
  
  let logs = [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'admin',
      action: 'login',
      device_id: null,
      hostname: null,
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0...',
      details: { success: true }
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'admin',
      action: 'create_user',
      device_id: null,
      hostname: null,
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0...',
      details: { username: 'newuser', role: 'viewer' }
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      username: 'viewer1',
      action: 'create_command',
      device_id: 'device-1',
      hostname: 'DESKTOP-ABC123',
      ip_address: '192.168.1.101',
      user_agent: 'Mozilla/5.0...',
      details: { command: 'refresh_now' }
    },
    {
      id: 'log-4',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'admin',
      action: 'update_user',
      device_id: null,
      hostname: null,
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0...',
      details: { user_id: 'some-id', role: 'admin' }
    },
    {
      id: 'log-5',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'admin',
      action: 'delete_user',
      device_id: null,
      hostname: null,
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0...',
      details: { username: 'olduser' }
    }
  ];

  // Filter by action if provided
  if (action) {
    logs = logs.filter(log => log.action === action);
  }

  res.json({
    audit_logs: logs,
    pagination: {
      total: logs.length,
      page,
      limit,
      total_pages: Math.ceil(logs.length / limit)
    }
  });
});

app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
  console.log('Ready to accept login requests!');
  console.log('Admin endpoints: /v1/users, /v1/audit-logs');
});