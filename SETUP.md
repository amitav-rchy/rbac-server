# RBAC System Backend - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 2. Setup Database

#### Option A: Local PostgreSQL
```bash
# Create .env file
cp .env.example .env

# Update DATABASE_URL in .env with your PostgreSQL connection string
# Example: postgresql://user:password@localhost:5432/rbac_db

# Run Prisma migrations
pnpm run prisma:migrate

# (Optional) Seed the database with initial data
pnpm run prisma:seed
```

#### Option B: Prisma Postgres (Cloud)
```bash
# Login to Prisma
pnpm run prisma:login

# Create a new Prisma Postgres database
pnpm run prisma:create-db

# Update .env with the connection string provided

# Run migrations
pnpm run prisma:migrate
```

### 3. Start Development Server

```bash
# Development with hot-reload
pnpm run start:dev

# Production build
pnpm run build
pnpm run start:prod
```

The server will start at: `http://localhost:3001/api/v1`

Swagger docs: `http://localhost:3001/api/docs`

---

## Architecture Overview

### Project Structure

```
src/
├── auth/                    # Authentication & JWT
│   ├── decorators/         # Permission decorator
│   ├── dto/                # DTOs
│   ├── guards/             # Permission guard
│   ├── strategies/         # JWT strategy
│   └── services/           # Auth service
├── users/                  # User management
├── permissions/            # Permission management
├── roles/                  # Role management
├── audit/                  # Audit logging
├── modules/
│   ├── leads/             # Lead management
│   ├── tasks/             # Task management
│   ├── reports/           # Reports generation
│   ├── dashboard/         # Dashboard API
│   ├── customer-portal/   # Customer portal
│   └── settings/          # Application settings
├── common/
│   ├── filters/           # Exception filters
│   ├── interceptors/      # Response interceptors
│   └── constants.ts       # App constants
└── database/
    └── prisma.service.ts  # Prisma integration
```

### Permission Architecture

- **Dynamic Permissions**: Every feature is protected by an atomic permission
- **Role-Based Access**: Roles contain base permissions
- **User Overrides**: Users can have additional permissions on top of roles
- **Granular Control**: Managers can only grant permissions they possess

### Authentication Flow

1. **Login**: User provides email/password
2. **Token Generation**: Access token (15m) + Refresh token (7d) created
3. **Session Creation**: Session stored in database with token hash
4. **Access**: Bearer token sent with each request
5. **Refresh**: Expired access token renewed via refresh token
6. **Logout**: Session invalidated, tokens blacklisted

---

## API Documentation

### Authentication Endpoints

```
POST   /api/v1/auth/login         - Login
POST   /api/v1/auth/refresh       - Refresh access token
POST   /api/v1/auth/logout        - Logout
GET    /api/v1/auth/me            - Get current user
```

### User Management

```
GET    /api/v1/users              - List users
GET    /api/v1/users/:id          - Get user by ID
POST   /api/v1/users              - Create user
PATCH  /api/v1/users/:id          - Update user
DELETE /api/v1/users/:id          - Delete user
PATCH  /api/v1/users/:id/suspend  - Suspend user
PATCH  /api/v1/users/:id/ban      - Ban user
PATCH  /api/v1/users/:id/activate - Activate user
PATCH  /api/v1/users/:id/reset-password - Reset password
```

### Permissions

```
GET    /api/v1/permissions                    - List all permissions
POST   /api/v1/permissions                    - Create permission
PATCH  /api/v1/permissions/:id                - Update permission
DELETE /api/v1/permissions/:id                - Delete permission
POST   /api/v1/permissions/users/:userId/grant  - Grant permission to user
POST   /api/v1/permissions/users/:userId/revoke - Revoke permission from user
```

### Roles

```
GET    /api/v1/roles                     - List roles
POST   /api/v1/roles                     - Create role
PATCH  /api/v1/roles/:id                 - Update role
DELETE /api/v1/roles/:id                 - Delete role
POST   /api/v1/roles/:id/permissions     - Assign permission to role
DELETE /api/v1/roles/:id/permissions/:permissionId - Remove permission from role
```

### Leads, Tasks, Reports

```
GET    /api/v1/leads              - List leads
POST   /api/v1/leads              - Create lead
PATCH  /api/v1/leads/:id          - Update lead
DELETE /api/v1/leads/:id          - Delete lead

GET    /api/v1/tasks              - List tasks
POST   /api/v1/tasks              - Create task
PATCH  /api/v1/tasks/:id          - Update task
DELETE /api/v1/tasks/:id          - Delete task

GET    /api/v1/reports            - List reports
POST   /api/v1/reports            - Create report
DELETE /api/v1/reports/:id        - Delete report
```

### Dashboard & Portal

```
GET    /api/v1/dashboard          - Get user dashboard
GET    /api/v1/customer-portal/dashboard  - Customer portal dashboard
GET    /api/v1/customer-portal/profile    - Customer profile
```

### Audit Logs

```
GET    /api/v1/audit-logs         - List audit logs
GET    /api/v1/audit-logs/:id     - Get audit log
GET    /api/v1/audit-logs/user/:userId - Get user's audit logs
```

### Settings

```
GET    /api/v1/settings           - Get all settings
GET    /api/v1/settings/:key      - Get setting by key
PATCH  /api/v1/settings/:key      - Update setting
DELETE /api/v1/settings/:key      - Delete setting
```

---

## Database Schema

### Core Tables

- **users** - User accounts with roles and status
- **roles** - Role definitions with hierarchy
- **permissions** - Atomic permission definitions
- **role_permissions** - Role-Permission junction
- **user_permissions** - User-Permission overrides
- **sessions** - Active user sessions
- **audit_logs** - Append-only audit trail
- **leads** - Lead records
- **tasks** - Task records
- **reports** - Generated reports
- **settings** - Application settings

---

## Key Features

### Security

✅ Password hashing with bcrypt
✅ JWT tokens with expiration
✅ Refresh token rotation
✅ Session management
✅ Brute force protection
✅ Rate limiting ready
✅ CORS configuration
✅ Helmet security headers
✅ Input validation with class-validator
✅ Audit logging for all actions

### RBAC System

✅ Dynamic atomic permissions
✅ Role hierarchy (Admin > Manager > Agent > Customer)
✅ Permission grants & revokes
✅ Manager permission ceiling
✅ User-specific overrides
✅ Effective permission resolution
✅ Permission-based guards
✅ Decorator-based permission checks

### API Features

✅ Comprehensive error handling
✅ Global exception filter
✅ Response transformation
✅ Swagger documentation
✅ Bearer token authentication
✅ HTTPOnly cookie refresh tokens
✅ CORS for frontend integration
✅ Pagination support
✅ Filtering & sorting ready

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rbac_db

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=your-secret-key-change-this-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Security
BCRYPT_ROUNDS=10
SESSION_SECRET=your-session-secret-change-this-in-production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=30

# Login Security
MAX_LOGIN_ATTEMPTS=5
LOGIN_ATTEMPT_RESET_MINUTES=15
```

---

## Scripts

```bash
# Development
pnpm run start:dev            # Start with hot reload

# Production
pnpm run build                # Build
pnpm run start:prod           # Start production build

# Database
pnpm run prisma:migrate       # Run migrations
pnpm run prisma:studio        # Open Prisma Studio
pnpm run prisma:generate      # Generate Prisma Client

# Code Quality
pnpm run lint                 # Run ESLint
pnpm run format               # Format code

# Testing
pnpm run test                 # Run tests
pnpm run test:watch           # Run tests in watch mode
pnpm run test:e2e             # Run end-to-end tests
```

---

## Permission Examples

### Default Permissions by Role

**Admin**: Full access to all permissions
**Manager**: 
- view_dashboard
- view_users, view_permissions, view_roles
- view_leads, manage_leads, create_leads
- view_tasks, manage_tasks
- view_reports
- view_audit_logs

**Agent**:
- view_dashboard
- view_leads, manage_leads, create_leads
- view_tasks, manage_tasks
- view_reports

**Customer**:
- customer_portal_access

---

## Testing & Deployment

### Local Development

1. Ensure PostgreSQL is running
2. Copy `.env.example` to `.env`
3. Update DATABASE_URL
4. Run `pnpm install`
5. Run `pnpm run prisma:migrate`
6. Run `pnpm run start:dev`

### Docker (Optional)

Create a `Dockerfile` and `docker-compose.yml` for containerization.

### Production Considerations

1. **Environment Variables**: Use `.env.production` with secure values
2. **SSL/TLS**: Use HTTPS in production
3. **Secret Management**: Use environment variables or secrets vault
4. **Rate Limiting**: Implement Redis-based rate limiting
5. **Monitoring**: Add logging, monitoring, and alerting
6. **Database**: Use managed PostgreSQL service
7. **Sessions**: Consider Redis for session management

---

## Frontend Integration

### Login Example

```typescript
// POST /api/v1/auth/login
const response = await fetch('http://localhost:3001/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for cookies
  body: JSON.stringify({ email, password }),
});

const { accessToken, user } = await response.json();
// Store accessToken in memory (not localStorage)
// Refresh token is in httpOnly cookie (automatic)
```

### Authenticated Requests

```typescript
const response = await fetch('http://localhost:3001/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  credentials: 'include',
});
```

### Refresh Token

```typescript
// POST /api/v1/auth/refresh
const response = await fetch('http://localhost:3001/api/v1/auth/refresh', {
  method: 'POST',
  credentials: 'include', // Sends refresh token cookie
});

const { accessToken: newAccessToken } = await response.json();
// Update accessToken in memory
```

---

## Support & Documentation

- NestJS: https://docs.nestjs.com
- Prisma: https://www.prisma.io/docs
- JWT: https://jwt.io
- PostgreSQL: https://www.postgresql.org/docs

---

## License

UNLICENSED
