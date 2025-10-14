const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 8080;
const JWT_SECRET = 'this_is_a_very_secure_jwt_secret_key_for_development_only_32chars';

app.use(cors());
app.use(express.json());

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

// Mock devices stats
app.get('/v1/devices/stats', (req, res) => {
  res.json({
    total: 5,
    online: 3,
    offline: 1,
    error: 1
  });
});

// Mock devices list
app.get('/v1/devices', (req, res) => {
  res.json({
    data: [
      {
        id: 'device-1',
        hostname: 'DESKTOP-ABC123',
        os_caption: 'Windows 11 Pro',
        status: 'active',
        last_seen: new Date().toISOString(),
        is_online: true
      },
      {
        id: 'device-2', 
        hostname: 'LAPTOP-XYZ789',
        os_caption: 'Windows 10 Pro',
        status: 'inactive',
        last_seen: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        is_online: false
      }
    ],
    pagination: {
      total: 2,
      page: 1,
      limit: 20,
      total_pages: 1
    }
  });
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