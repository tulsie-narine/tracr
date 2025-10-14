# Deployment Guide

This guide covers deploying Tracr to production using Vercel for the web frontend and configuring agents to communicate with the deployed API backend.

## Overview

Tracr consists of three main components in production:

```
[Windows Devices]           [Users/Admins]
      |                           |
 [Tracr Agent]              [Web Browser]
      |                           |
      |                           |
      +---------> [API Backend] <-----------+
                      |
                [PostgreSQL]
                      |
               [Web Frontend]
                (Vercel)
```

- **Agent**: Installed on Windows devices, collects inventory data and sends to API backend
- **API Backend**: Handles device registration, data storage, user authentication, and command processing
- **Web Frontend**: Dashboard for viewing devices, managing users, and administering the system
- **Database**: PostgreSQL database storing device data, users, and audit logs

## Prerequisites

Before deploying, ensure you have:

- [ ] Vercel account (free tier available)
- [ ] API backend deployed and accessible via HTTPS
- [ ] PostgreSQL database provisioned and migrations run
- [ ] API backend environment variables configured (JWT_SECRET, DATABASE_URL, etc.)
- [ ] SSL/TLS certificates configured for API backend
- [ ] Domain names for both API backend and web frontend (optional but recommended)

## Pre-Deployment Checklist

- [ ] API backend is deployed and accessible at a public URL (e.g., `https://api.tracr.example.com`)
- [ ] Database migrations have been run and database is accessible
- [ ] API backend environment variables are configured:
  - `DATABASE_URL` - PostgreSQL connection string
  - `JWT_SECRET` - Strong random secret (minimum 32 characters)
  - `PORT` - Port number (default: 8443)
  - `TLS_CERT_FILE` and `TLS_KEY_FILE` - SSL certificate paths
- [ ] API backend CORS is configured to allow requests from your Vercel deployment URL
- [ ] Test API backend health endpoint: `curl https://api.tracr.example.com/health`

## Testing Production Build Locally

Before deploying to Vercel, test the production build locally to catch issues early:

### Step 1: Configure Environment Variables
Create `.env.local` with production-like values:
```bash
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL to your API backend URL
```

### Step 2: Create Production Build
```bash
npm run build
```
Check for:
- Build errors or TypeScript errors
- Warning messages about unused dependencies
- Bundle size warnings

### Step 3: Run Production Server
```bash
npm run start
```
The production server will start on `http://localhost:3000`

### Step 4: Test Critical Flows
Test the following functionality:
- [ ] Login with admin credentials
- [ ] Device list page loads and displays data
- [ ] Device detail page with all tabs (Overview, Snapshots, Performance, Volumes, Software, Commands)
- [ ] Software catalog page with search and filtering
- [ ] Admin pages (Users, Audit Logs) - admin only
- [ ] User creation, editing, and deletion - admin only
- [ ] Command creation and status tracking - admin only
- [ ] Responsive design on mobile/tablet/desktop

### Step 5: Check Browser Console
- [ ] No JavaScript errors in browser console
- [ ] API calls are successful (check Network tab)
- [ ] Authentication is working properly
- [ ] Real-time updates (SWR polling) are functioning

### Common Issues and Solutions

**Build Errors:**
```bash
npm run type-check
```
Fix any TypeScript errors before proceeding.

**API Connection Errors:**
- Verify `NEXT_PUBLIC_API_URL` is correct and accessible
- Check that API backend is running and healthy
- Verify SSL certificate is valid (browsers reject self-signed certificates)

**Authentication Errors:**
- Ensure JWT_SECRET matches between frontend and API backend
- Check that API backend `/v1/auth/login` endpoint is working

**CORS Errors:**
- Verify API backend CORS configuration includes frontend URL
- Check browser console for specific CORS error messages

## Vercel Deployment

### Step 1: Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository (GitHub, GitLab, or Bitbucket)
4. **🚨 CRITICAL**: Set root directory to `web/` (not the repository root)
   - This prevents Vercel from trying to deploy the Go API backend
   - Without this, you'll get: "Could not find an exported function" error

**If you get "Could not find an exported function" error:**
- Go to Project Settings → General → Root Directory
- Change from `.` to `web`
- Click Save and redeploy

### Step 2: Configure Build Settings

Vercel auto-detects Next.js projects, but verify these settings:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node.js Version**: 20.x (recommended for Next.js 15+)

### Step 3: Configure Environment Variables

Add the following environment variables in Vercel dashboard:

| Variable | Value | Example |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | Your API backend URL | `https://api.tracr.example.com` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `Tracr` |
| `NEXT_PUBLIC_APP_VERSION` | Current version | `1.0.0` |

**Important:**
- Set variables for all environments: Production, Preview, Development
- Preview deployments can use staging API URL if available
- Variables are embedded in the client bundle at build time
- Never store secrets in `NEXT_PUBLIC_` variables

### Step 4: Deploy

1. Click "Deploy" button
2. Wait for build to complete (typically 2-3 minutes)
3. Vercel provides a deployment URL (e.g., `https://tracr-abc123.vercel.app`)

### Step 5: Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `tracr.example.com`)
3. Configure DNS records as instructed by Vercel:
   - CNAME record pointing to `cname.vercel-dns.com`
   - Or A record pointing to Vercel's IP addresses
4. Vercel automatically provisions SSL certificate

### Step 6: Verify Deployment

- [ ] Visit deployment URL and test login
- [ ] Verify all pages load correctly
- [ ] Check browser console for errors
- [ ] Test device list, device detail, and admin functionality
- [ ] Verify API calls are working with production backend
- [ ] Test real-time updates (SWR polling)

## Post-Deployment Configuration

### Update API Backend CORS

Add your Vercel deployment URL to the API backend's CORS allowed origins:

```go
// In your API backend CORS configuration
allowedOrigins := []string{
    "https://tracr.vercel.app",           // Vercel deployment URL
    "https://tracr.example.com",         // Custom domain (if configured)
    "http://localhost:3000",             // Local development
}
```

Restart the API backend to apply changes.

### Monitor Deployment

- Check Vercel deployment logs for errors
- Monitor API backend logs for increased traffic
- Set up error tracking (Sentry, LogRocket, etc.) if desired
- Enable Vercel Analytics for performance monitoring

## Agent Configuration for Production

Agents communicate directly with the API backend, not the web frontend. After deployment, configure agents to point to your production API URL.

### Configuration Methods

#### Method 1: Configuration File (Recommended)

**Location**: `C:\ProgramData\TracrAgent\config.json`

Edit the configuration file:
```json
{
  "api_endpoint": "https://api.tracr.example.com",
  "collection_interval": "15m",
  "heartbeat_interval": "5m",
  "log_level": "info"
}
```

Restart the Tracr Agent service:
```powershell
Restart-Service TracrAgent
```

#### Method 2: Environment Variable

Set the `TRACR_API_ENDPOINT` environment variable:
```powershell
[System.Environment]::SetEnvironmentVariable("TRACR_API_ENDPOINT", "https://api.tracr.example.com", "Machine")
```

Restart the Tracr Agent service to apply changes.

#### Method 3: Installer Configuration

During agent installation, provide the API endpoint as a parameter:
```cmd
msiexec /i TracrAgent.msi API_ENDPOINT=https://api.tracr.example.com /quiet
```

### Agent Registration Process

1. Agent starts and reads configuration
2. Agent calls `POST /v1/agents/register` with hostname and OS version
3. API backend returns `device_id` and `device_token`
4. Agent saves credentials to config file
5. Agent uses token for all subsequent API calls
6. Device appears in web frontend device list

### Verification

**Check Agent Status:**
```powershell
Get-Service TracrAgent
Get-Content "C:\ProgramData\TracrAgent\logs\agent.log" -Tail 20
```

**Look for successful registration:**
```
INFO Agent registered successfully: device_id=abc123, hostname=DESKTOP-XYZ
INFO Starting heartbeat goroutine
INFO Starting command polling goroutine
```

**Verify in Web Frontend:**
- Device appears in device list
- Device status shows as "Online" (green badge)
- Snapshots tab shows recent inventory data
- Last seen timestamp is recent

### Troubleshooting

**Agent not registering:**
- Verify `api_endpoint` URL is correct and accessible
- Check firewall rules allow outbound HTTPS traffic
- Verify SSL certificate is valid (agents validate certificates)
- Check agent logs for detailed error messages

**Agent registered but not sending data:**
- Verify `device_token` is saved in config file
- Check agent logs for authentication errors
- Verify API backend is accepting requests
- Check network connectivity between agent and API backend

**Device shows as "Offline" in web frontend:**
- Agent hasn't sent heartbeat in last 5 minutes
- Check agent service is running: `Get-Service TracrAgent`
- Check agent logs for errors
- Verify network connectivity

## Environment-Specific Configuration

### Development
- **API URL**: `http://localhost:8080` (or `https://localhost:8443` with TLS)
- **Agent endpoint**: Same as API URL
- **Database**: Local PostgreSQL instance

### Staging (Optional)
- **API URL**: `https://api-staging.tracr.example.com`
- **Agent endpoint**: Same as API URL
- **Database**: Staging PostgreSQL instance
- **Vercel Preview**: Use staging API for pull request previews

### Production
- **API URL**: `https://api.tracr.example.com`
- **Agent endpoint**: Same as API URL
- **Database**: Production PostgreSQL instance
- **Vercel Production**: Main branch deployment

## Continuous Deployment

- Vercel automatically deploys on push to main branch (Production)
- Vercel creates Preview deployments for pull requests
- Configure branch protection rules in Git repository
- Set up automated testing in CI/CD pipeline
- Use Vercel deployment hooks for notifications

## Monitoring and Maintenance

### Vercel Analytics
- Enable Vercel Analytics for performance monitoring
- Track Core Web Vitals (LCP, FID, CLS)
- Monitor page load times and user interactions

### Error Tracking
- Integrate Sentry for frontend error tracking
- Monitor API errors and frontend errors separately
- Set up alerts for critical errors

### Uptime Monitoring
- Use UptimeRobot or similar for API and web frontend monitoring
- Set up alerts for downtime
- Monitor SSL certificate expiration dates

### Database Maintenance
- Regular backups of PostgreSQL database
- Monitor database performance and query times
- Plan for database scaling as device count grows

## Scaling Considerations

### Web Frontend
- Vercel automatically scales based on traffic
- Consider Vercel Pro plan for higher limits
- No manual scaling needed for frontend

### API Backend
- Monitor API response times and error rates
- Scale horizontally with multiple instances and load balancer
- Consider caching with Redis for frequently accessed data
- Monitor database connections and add connection pooling

### Agent Deployment
- Use Group Policy or MDM for mass deployment
- Stagger deployments to avoid overwhelming API backend
- Monitor agent registration rate and API load

## Security Best Practices

### Web Frontend
- Environment variables are public (embedded in client bundle)
- Never store secrets in `NEXT_PUBLIC_` variables
- Use HTTPS only (Vercel provides automatic SSL)
- Regular dependency updates for security patches

### API Backend
- Use strong JWT secret (minimum 32 characters, random)
- Enable rate limiting to prevent abuse
- Use parameterized queries to prevent SQL injection
- Regular security audits and penetration testing

### Agent Communication
- Agents use device tokens for authentication
- Use HTTPS for all agent-API communication
- Validate SSL certificates on agent side
- Implement token rotation policy

## Rollback Procedures

### Vercel Rollback
1. Go to Vercel dashboard → Deployments
2. Find previous successful deployment
3. Click "..." menu and select "Promote to Production"
4. Instant rollback with zero downtime

### API Backend Rollback
- Keep previous version available for quick rollback
- Test rollback procedures regularly
- Consider blue-green deployment strategy

### Database Rollback
- Restore from backup if needed
- Test backup restoration procedures regularly
- Consider point-in-time recovery for PostgreSQL

## Support and Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Tracr API Documentation**: See `../api/README.md`
- **Agent Documentation**: See `../agent/README.md`