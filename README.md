# Windows Inventory Agent System

A comprehensive Windows inventory management system consisting of a Windows service agent for data collection, a backend API for ingestion and commands, and a web UI for visualization and control.

## System Architecture

The system follows a three-tier architecture:

- **Agent**: Go-based Windows service that collects system inventory using WMI and Windows Registry
- **API**: Go backend with Fiber framework and PostgreSQL for data ingestion, authentication, and command management
- **Web**: Next.js React frontend for device visualization and administrative controls

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

## Deployment Overview

1. **Database Setup**: Deploy PostgreSQL and run initial migrations
2. **API Deployment**: Deploy API service with proper configuration
3. **Web UI Deployment**: Build and deploy Next.js application
4. **Agent Distribution**: Create and distribute MSI packages to endpoints

## Security Considerations

- All communication encrypted with TLS 1.2+
- Device-specific authentication tokens
- JWT-based web authentication with role-based access
- Audit logging for administrative actions
- Token rotation capabilities
- No inbound firewall rules required (poll-based architecture)

## Documentation

- [Architecture Documentation](./docs/architecture.md)
- [Deployment Guide](./docs/deployment.md)
- [Security Documentation](./docs/security.md)
- [API Examples](./docs/api-examples.md)
- [Troubleshooting Guide](./docs/runbooks/troubleshooting.md)

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and contribution process.

## License

See [LICENSE](./LICENSE) file for license information.