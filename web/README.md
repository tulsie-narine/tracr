# Tracr Web Frontend

Device management and monitoring dashboard built with Next.js 14+, React 18+, TypeScript, Tailwind CSS, Shadcn/ui, and SWR.

## Overview

Tracr Web Frontend is the web interface for managing devices, viewing inventory snapshots, and administering users in the Tracr device management system. It provides a modern, responsive dashboard for IT administrators and viewers to monitor and manage their Windows device fleet.

## Technology Stack

- **Next.js 14+** - React framework with App Router
- **React 18+** - UI library with modern features
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Accessible component library
- **SWR** - Data fetching and caching with real-time polling
- **React Hook Form** - Form handling with validation
- **Zod** - Schema validation
- **Date-fns** - Date manipulation and formatting
- **Recharts** - Interactive charts for performance visualization
- **Command Management** - Dialog-based command creation with real-time status tracking
- **Software Catalog** - Server-side aggregation for optimal performance

## Prerequisites

- Node.js 18+ or 20+
- npm, yarn, or pnpm
- Running Tracr API backend (see `../api/README.md`)

## Getting Started

1. **Clone the repository and navigate to the web directory:**
   ```bash
   cd tracr/web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and update the values as needed:
   - `NEXT_PUBLIC_API_URL` - URL of the Tracr API backend (default: http://localhost:8080)
   - `NEXT_PUBLIC_APP_NAME` - Application name (default: Tracr)
   - `NEXT_PUBLIC_APP_VERSION` - Application version (default: 1.0.0)

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Authentication

The application uses JWT-based authentication with the following features:

- **Default Credentials:** Username: `admin`, Password: `admin123`
- **Token Storage:** JWT tokens are stored in localStorage and expire after 24 hours (default)
- **Auto-Redirect:** Users are automatically redirected to login when tokens expire
- **Role-Based Access Control:**
  - **Viewer Role:** Can access dashboard, devices, and software pages
  - **Admin Role:** Can additionally access user management and audit logs

## Project Structure

```
web/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/            # Public authentication pages (login)
│   │   ├── login/         # Login page
│   │   └── layout.tsx     # Auth layout (minimal, centered)
│   ├── (protected)/       # Protected pages requiring authentication
│   │   ├── dashboard/     # Dashboard page
│   │   └── layout.tsx     # Main layout with sidebar navigation
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page (redirects to login/dashboard)
│   └── providers.tsx      # SWR and auth providers
├── components/            # React components
│   ├── ui/               # Shadcn/ui components
│   ├── protected-route.tsx # Authentication wrapper component
│   ├── sidebar.tsx       # Main navigation sidebar
│   └── user-menu.tsx     # User profile dropdown menu
├── lib/                   # Utility functions and configurations
│   ├── api-client.ts     # API client with authentication
│   ├── auth-context.tsx  # React context for authentication state
│   ├── env.ts            # Environment configuration
│   ├── swr-config.ts     # SWR global configuration
│   └── utils.ts          # Utility functions
├── types/                 # TypeScript type definitions
│   ├── api.ts            # Device-related types
│   ├── audit.ts          # Audit log types
│   ├── command.ts        # Command types
│   ├── common.ts         # Common types and pagination
│   ├── snapshot.ts       # Snapshot and inventory types
│   ├── user.ts           # User and authentication types
│   └── index.ts          # Type exports
├── public/               # Static assets
├── .env.example          # Environment variables template
├── .env.local           # Local environment variables (not committed)
└── README.md            # This file
```

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run type-check` - Run TypeScript type checking

## Production Build Testing

Before deploying to production, it's important to test the production build locally:

```bash
npm run build        # Create optimized production build
npm run start        # Start production server on localhost:3000
npm run type-check   # Verify TypeScript compilation
```

**Why test production builds?**
- Production builds are optimized and may behave differently than development
- Catches build errors, TypeScript issues, and missing dependencies
- Verifies environment variables are configured correctly
- Tests SSR/SSG behavior and performance optimizations

**What to test:**
- All pages load without errors
- Authentication and authorization work correctly
- API calls function with production API URL
- Real-time updates (SWR polling) are working
- Responsive design on different screen sizes

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive testing procedures.

## Environment Variables

All environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Base URL for the API backend | `http://localhost:8080` | Yes |
| `NEXT_PUBLIC_APP_NAME` | Application name | `Tracr` | No |
| `NEXT_PUBLIC_APP_VERSION` | Application version | `1.0.0` | No |

**Important Notes:**
- Environment variables are embedded in the client bundle at build time
- Changing environment variables requires rebuilding the application
- `NEXT_PUBLIC_` variables are visible in the browser - never store secrets
- For production deployment configuration, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## Development Guidelines

### TypeScript
- TypeScript is required for all files
- Use strict type checking
- Define interfaces for all API responses and requests
- Import types from `@/types` for consistency

### Components
- Use Shadcn/ui components for consistency and accessibility
- Follow Next.js App Router conventions
- Use server components by default, client components when needed
- Keep components small and focused

### Data Fetching
- Use SWR hooks for all API calls
- Global configuration handles authentication and error handling
- Use TypeScript generics with SWR for type safety
- Handle loading, error, and success states

### Styling
- Use Tailwind CSS utility classes
- Use CSS variables for theme colors (configured by Shadcn/ui)
- Follow responsive design principles
- Use the `cn()` utility for conditional classes

### Authentication
- JWT token-based authentication
- Tokens stored in localStorage
- Automatic token refresh on API calls
- Role-based access control (viewer, admin)

## Features

### Device Management
- **Device List** - View all devices with search, filtering, and pagination
- **Device Details** - Comprehensive device information with tabbed interface:
  - Overview: System information, hardware details, and status
  - Snapshots: Historical inventory data with timeline
  - Performance: CPU and memory usage charts with multiple time ranges
  - Volumes: Storage information with usage indicators and health status
  - Software: Installed applications and programs
  - Commands: Command history and execution (admin: create new commands)

### Command Management
- **Location:** Device detail page, Commands tab
- **Features:**
  - View command history with status tracking (queued, in progress, completed, failed, expired)
  - Create new commands (admin only) via dialog interface
  - Filter commands by status
  - Real-time status updates with 30-second polling
  - View command execution results and timestamps
  - Currently supports "Refresh Now" command type
- **Access Control:** All authenticated users can view command history, only admins can create commands

### Software Catalog
- **Location:** `/software` page (accessible from sidebar)
- **Features:**
  - Aggregated software inventory across all devices
  - Search by software name
  - Filter by publisher
  - Sort by name, device count, or latest seen
  - Shows device count for each software/version combination
  - Pagination with 50 items per page
  - Real-time updates with 2-minute polling
- **Access Control:** All authenticated users (viewer+) can access

### Admin Panel (Admin Only)
- **Location:** `/admin/users` and `/admin/audit` pages (accessible from sidebar)
- **Access Control:** Only users with admin role can access these pages
- **Features:**
  - **User Management** (`/admin/users`):
    - View all user accounts with pagination
    - Create new users with username, password, and role
    - Edit existing users (update password and role)
    - Delete users (prevents deletion of last admin)
    - Real-time updates with 60-second polling
    - Role badges (Admin, Viewer) for easy identification
  - **Audit Logs** (`/admin/audit`):
    - View system activity and user actions
    - Filter by action type (create_command, create_user, update_user, delete_user, login)
    - Filter by date range (start date, end date)
    - Shows username and device hostname (joined data)
    - Displays IP address and user agent for each action
    - Pagination with 50 logs per page
    - Real-time updates with 60-second polling

### User Management
- **Role-Based Access Control:**
  - **Viewer role:** Can access dashboard, devices, software catalog
  - **Admin role:** Can access all viewer features plus user management and audit logs
  - Sidebar automatically shows/hides admin menu items based on user role
  - Admin pages show 403 Forbidden message if accessed by non-admin users
- **Authentication:**
  - JWT token-based authentication
  - Default admin credentials: username `admin`, password `admin123`
  - Admins can create additional users and assign roles
  - Last admin user cannot be deleted (system protection)

### Navigation
- Software catalog accessible from sidebar under "Software" menu item
- Command management accessible from device detail page, Commands tab
- Admin pages accessible from sidebar under "Users" and "Audit Logs" menu items (admin only)
- All features integrate seamlessly with existing authentication and role-based access control

## API Integration

The frontend integrates with the Tracr API backend using TypeScript interfaces that mirror the Go API models:

- **Devices** - List, view, register, and manage devices
- **Snapshots** - View inventory data and performance metrics
- **Users** - Authentication and user management
- **Commands** - Send commands to devices with real-time status tracking
- **Software** - View aggregated software catalog across devices
- **Audit Logs** - Track administrative actions

All API types are defined in the `types/` directory and provide full type safety.

## Authentication

### Default Credentials
- **Username:** admin
- **Password:** admin123

### Roles
- **Viewer** - Read-only access to devices, snapshots, and software catalog
- **Admin** - Full access including user management, audit logs, and command creation

### JWT Tokens
- Stored in localStorage as `auth_token`
- Automatically included in API requests
- Cleared on authentication errors

## Deployment

📋 **For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)**

### Quick Start

#### Testing Production Build Locally
Before deploying, test the production build locally:
```bash
npm run build        # Create production build
npm run start        # Start production server
npm run type-check   # Check TypeScript errors
```
See DEPLOYMENT.md for comprehensive testing procedures.

#### Vercel Deployment (Recommended)

1. **Connect repository to Vercel:**
   - Import the project in Vercel dashboard
   - **Important**: Set root directory to `web/`

2. **Configure environment variables:**
   - Set `NEXT_PUBLIC_API_URL` to your production API URL
   - See DEPLOYMENT.md for complete environment variable list

3. **Deploy:**
   - Vercel automatically deploys on push to main branch
   - Build command: `npm run build`
   - Output directory: `.next`

#### Agent Configuration
After deployment, configure agents to point to production API URL:
- Agents communicate with API backend, not web frontend
- Update `api_endpoint` in agent configuration
- See DEPLOYMENT.md for detailed agent configuration instructions

### Manual Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm run start
   ```

3. **Configure reverse proxy:**
   - Point your web server to `http://localhost:3000`
   - Configure SSL/TLS certificates
   - Set up proper security headers

## Troubleshooting

### Common Issues

1. **API Connection Errors:**
   - Verify `NEXT_PUBLIC_API_URL` is correct
   - Check that the API backend is running
   - Verify network connectivity

2. **Authentication Issues:**
   - Clear localStorage: `localStorage.removeItem('auth_token')`
   - Check API authentication endpoints
   - Verify JWT secret configuration

3. **Build Errors:**
   - Run `npm run type-check` to check TypeScript errors
   - Run `npm run lint` to check linting issues
   - Clear `.next` directory and rebuild

4. **Environment Variables:**
   - Ensure variables are prefixed with `NEXT_PUBLIC_`
   - Restart development server after changes
   - Check browser developer tools for values

### Performance Optimization

- Images are optimized by Next.js by default
- SWR provides intelligent caching and deduplication
- Turbopack for faster development builds
- Static generation where possible

## Contributing

1. Follow TypeScript strict mode requirements
2. Use Prettier for code formatting
3. Run linting and type checking before commits
4. Follow Next.js App Router conventions
5. Maintain type safety throughout the application

## License

This project is part of the Tracr device management system.
