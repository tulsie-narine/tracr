# Windows Inventory Agent System

A comprehensive Windows inventory management system consisting of a Windows service agent for data collection, a backend API for ingestion and commands, and a web UI for visualization and control.

## 🚀 Quick Deploy

**Deploy Mock API Server to Railway:**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/8kzPYu?referralCode=alphasec)

**Frontend (Vercel):** Already deployed at `tracr-silk.vercel.app`

## System Architecture

The system follows a three-tier architecture with secure communication between components:

```
[Windows Devices]           [Users/Admins]
      |                           |
 [Tracr Agent]              [Web Browser]
      |                           |
      |                           |
      +---------> [API Backend] <-----------+
                      |
                [PostgreSQL Database]
                      |
               [Web Frontend]
              (Vercel/Hosting)
```

**Communication Flow:**
- **Agent → API Backend**: Device registration, inventory submission, heartbeat, command polling (HTTPS)
- **Web Frontend → API Backend**: User authentication, device management, admin operations (HTTPS)
- **Users → Web Frontend**: Browser access to dashboard and admin interfaces (HTTPS)

**Components:**
- **Agent**: Go-based Windows service that collects system inventory using WMI and Windows Registry
- **API Backend**: Go backend with Fiber framework and PostgreSQL for data ingestion, authentication, and command management
- **Web Frontend**: Next.js React application for device visualization and administrative controls
- **Database**: PostgreSQL for storing device data, users, snapshots, and audit logs

## Components Overview

### Windows Agent
- Collects hardware, OS, performance, storage, and software inventory
- Runs as a Windows service with configurable collection intervals
- Secure communication with backend API using device tokens
- MSI installer for easy deployment

### Backend API
- RESTful API for agent registration and inventory submission
- JWT-based authentication for web UI
- Role-based access control (viewer/admin)
- Command queuing system for on-demand operations
- Audit logging for compliance

### Web UI
- Device inventory dashboard with search and filtering
- Detailed device views with performance metrics
- Software catalog aggregated across all devices
- Admin controls for device management and commands
- Audit trail for administrative actions

## Quick Start

### Development Setup

1. **Prerequisites**
   - Go 1.21+ for agent and API development
   - Node.js 18+ for web UI development
   - PostgreSQL 13+ for database
   - Docker and Docker Compose (optional)

2. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd tracr
   ```

3. **Start with Docker Compose**
   ```bash
   cd infra
   cp .env.example .env
   # Edit .env with your configuration
   docker-compose up -d
   ```

4. **Manual Setup**
   - See individual component READMEs for detailed setup instructions
   - [Agent Setup](./agent/README.md)
   - [API Setup](./api/README.md)
   - [Web UI Setup](./web/README.md)

## System Requirements

### Agent Requirements
- Windows 10/11 or Windows Server 2016+
- .NET Framework not required (native Go binary)
- Administrator privileges for service installation
- Network connectivity to API endpoint

### Server Requirements
- Linux/Windows server for API and database
- 2+ CPU cores, 4GB+ RAM for small deployments
- PostgreSQL 13+ database
- TLS certificate for HTTPS communication

## Deployment

### Production Deployment Overview

1. **API Backend**: Deploy to server with PostgreSQL database
2. **Web Frontend**: Deploy to Vercel (or Node.js hosting)
3. **Agent Configuration**: Configure agents to point to production API URL
4. **Agent Installation**: Install agents on Windows devices
5. **Verification**: Access web frontend and verify devices appear

### Prerequisites for Production

**For Deployment:**
- Vercel account (or Node.js hosting platform)
- Server for API backend (Linux/Windows with 2+ CPU cores, 4GB+ RAM)
- PostgreSQL database (version 12+)
- Domain names and SSL certificates
- Windows devices for agent installation

**For Development:**
- Node.js 20+ for web frontend development
- Go 1.21+ for API backend and agent development
- PostgreSQL 12+ for local database
- Git for version control

### Environment Variables Overview

**Web Frontend:**
- `NEXT_PUBLIC_API_URL` - URL of the deployed API backend
- `NEXT_PUBLIC_APP_NAME` - Application name (optional)
- `NEXT_PUBLIC_APP_VERSION` - Application version (optional)

**API Backend:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Strong random secret (minimum 32 characters)
- `PORT` - Server port (default: 8443)
- `TLS_CERT_FILE`, `TLS_KEY_FILE` - SSL certificate paths

**Agent:**
- `TRACR_API_ENDPOINT` - Production API URL
- `TRACR_DEVICE_TOKEN` - Device authentication token (auto-generated)
- `TRACR_LOG_LEVEL` - Logging verbosity

### Quick Start for Production

1. **Deploy API Backend** with PostgreSQL database (see `api/README.md`)
2. **Deploy Web Frontend** to Vercel (see `web/DEPLOYMENT.md` for detailed instructions)
3. **Configure Agents** to point to production API URL (see `agent/README.md`)
4. **Install Agents** on Windows devices using MSI installer
5. **Verify Deployment** by accessing web frontend and checking device list

## Security Features

**Communication Security:**
- All communication encrypted with HTTPS/TLS 1.2+
- Device-specific authentication tokens for agent communication
- JWT-based authentication for web users with role-based access control
- No inbound firewall rules required (agents use outbound HTTPS polling)

**Authentication & Authorization:**
- **Agent Authentication**: Device tokens (SHA-256 hashed in database)
- **User Authentication**: JWT tokens with expiration and refresh
- **Role-Based Access Control**: Viewer and Admin roles with granular permissions
- **Token Rotation**: Configurable token rotation policy (30 days default)

**Data Protection:**
- Password hashing with bcrypt for user accounts
- Parameterized queries to prevent SQL injection
- Input validation and sanitization
- Audit logging for administrative actions and compliance

**Production Security Best Practices:**
- Use strong JWT secrets (minimum 32 characters, random)
- Enable rate limiting to prevent abuse
- Regular dependency updates for security patches
- Valid SSL certificates (agents reject self-signed certificates)
- Minimal service account privileges for agent service

## Documentation

### Component-Specific Documentation
- **Web Frontend**: [web/README.md](./web/README.md) and [web/DEPLOYMENT.md](./web/DEPLOYMENT.md)
- **API Backend**: [api/README.md](./api/README.md)
- **Agent**: [agent/README.md](./agent/README.md)

### Deployment & Operations
- **Production Deployment**: [web/DEPLOYMENT.md](./web/DEPLOYMENT.md) - Comprehensive deployment guide
- **Agent Configuration**: [agent/README.md](./agent/README.md) - Production agent setup
- **Database Schema**: [api/internal/database/migrations/](./api/internal/database/migrations/) - Database structure

### Development
- **Architecture**: Component interaction and data flow
- **API Reference**: RESTful endpoints and authentication
- **Contributing**: Development guidelines and contribution process

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and contribution process.

## License

See [LICENSE](./LICENSE) file for license information.