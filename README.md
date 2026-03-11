# RBAC (Role-Based Access Control) System Backend

> Production-ready Dynamic Permission RBAC backend built with NestJS, TypeScript, PostgreSQL, and Prisma ORM.

[![NestJS](https://img.shields.io/badge/NestJS-11-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-latest-informational.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.20-2D3748.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-UNLICENSED-inactive.svg)]()

## 📋 Overview

Comprehensive Dynamic RBAC system with atomic permissions, JWT authentication, hierarchical roles, and comprehensive audit logging. Designed to serve Next.js and modern frontend applications.

### Key Features

- ✅ **Dynamic Atomic Permissions** - Every feature protected by single permissions
- ✅ **Hierarchical Roles** - Admin > Manager > Agent > Customer 
- ✅ **User Permission Overrides** - Grant/revoke permissions per user
- ✅ **JWT Authentication** - 15-min access tokens + 7-day refresh tokens
- ✅ **Brute Force Protection** - Login attempt rate limiting
- ✅ **Session Management** - Database-backed sessions with rotation
- ✅ **Audit Logging** - Append-only audit trail for all actions
- ✅ **Manager Permission Ceiling** - Managers can only grant permissions they possess
- ✅ **Comprehensive Security** - bcrypt hashing, helmet, CORS, input validation
- ✅ **Swagger Documentation** - Auto-generated API docs
- ✅ **Modular Architecture** - Clean, scalable project structure

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- pnpm (or npm)

### Installation

```bash
# 1. Clone and install
git clone <repo>
cd rbac-server
pnpm install

# 2. Setup environment
cp .env.example .env
# Update DATABASE_URL in .env

# 3. Setup database
pnpm run prisma:migrate

# 4. Seed initial data (optional)
pnpm run prisma:seed

# 5. Start development server
pnpm run start:dev
```

Server runs at: **http://localhost:3001/api/v1**  
Swagger docs: **http://localhost:3001/api/docs**

### Test Credentials (after seeding)

```
Admin:    admin@example.com / admin123456
Manager:  manager@example.com / manager123456
Agent:    agent@example.com / agent123456
Customer: customer@example.com / customer123456
```

## 📚 API Endpoints

### Authentication
```
POST   /auth/login              - Login
POST   /auth/refresh            - Refresh token
POST   /auth/logout             - Logout
GET    /auth/me                 - Get current user
```

### Users
```
GET    /users                   - List users
GET    /users/:id               - Get user
POST   /users                   - Create user
PATCH  /users/:id               - Update user
DELETE /users/:id               - Delete user
PATCH  /users/:id/suspend       - Suspend user
PATCH  /users/:id/ban           - Ban user
PATCH  /users/:id/activate      - Activate user
```

### Permissions & Roles
```
GET    /permissions             - List permissions
POST   /permissions             - Create permission
GET    /roles                   - List roles
POST   /roles                   - Create role
POST   /permissions/users/:userId/grant  - Grant permission
POST   /permissions/users/:userId/revoke - Revoke permission
```

### Business Modules
```
GET/POST /leads                 - Lead management
GET/POST /tasks                 - Task management
GET/POST /reports               - Report generation
GET      /dashboard             - User dashboard
GET      /customer-portal/*     - Customer portal
GET/POST /settings              - Application settings
```

### Audit
```
GET    /audit-logs              - List audit logs
GET    /audit-logs/:id          - Get audit log
GET    /audit-logs/user/:userId - User's audit logs
```

## 🏗️ Architecture

### Project Structure

```
src/
├── auth/                       # JWT & authentication
│   ├── decorators/            # @Permission decorator
│   ├── dto/                   # Auth DTOs
│   ├── guards/                # PermissionGuard
│   ├── strategies/            # JWT strategy
│   └── services/              # AuthService
├── users/                     # User management
├── permissions/               # Permission management  
├── roles/                     # Role management
├── audit/                     # Audit logging
├── modules/
│   ├── leads/                # Lead management
│   ├── tasks/                # Task management
│   ├── reports/              # Reports
│   ├── dashboard/            # Dashboard
│   ├── customer-portal/      # Customer portal
│   └── settings/             # Settings
├── common/
│   ├── filters/              # Exception filters
│   ├── interceptors/         # Response interceptors
│   └── constants.ts          # Constants
└── database/
    └── prisma.service.ts     # Prisma integration
```

### Database Schema

**Core Tables:**
- `users` - User accounts with roles
- `roles` - Role definitions  
- `permissions` - Atomic permissions
- `role_permissions` - Role-Permission mapping
- `user_permissions` - User permission overrides
- `sessions` - Active sessions
- `audit_logs` - Append-only audit trail
- `leads`, `tasks`, `reports` - Business data
- `settings` - Application configuration

## 🔐 Security Features

| Feature | Implementation |
|---------|-----------------|
| Password Hashing | bcrypt (10 rounds) |
| Access Tokens | JWT (15 minutes) |
| Refresh Tokens | JWT (7 days) + httpOnly cookie |
| Session Management | Database-backed, rotated on refresh |
| Brute Force Protection | Login attempt counter + timeout |
| Request Validation | class-validator DTOs |
| CORS Configuration | Configurable origins |
| Security Headers | Helmet.js |
| Rate Limiting | Environment-based config |
| Audit Logging | All actions tracked |

## 🔑 Permission System

### Atomic Permissions

Each feature is protected by a single permission:
```javascript
'view_dashboard'
'manage_users'
'view_leads'
'manage_tasks'
// ... 22 total permissions
```

### Permission Resolution

User's effective permissions = Role permissions + User overrides

```typescript
const userPermissions = await permissionService.getUserPermissions(userId);
// Returns: ['manage_users', 'view_reports', ...]
```

### Manager Permission Ceiling

Managers can only grant permissions they possess:

```typescript
// Manager with: ['view_leads', 'manage_leads']
// Can grant: view_leads, manage_leads
// Cannot grant: manage_users, delete_users
```

## 🗝️ Authentication Flow

1. **Login** → Credentials validated, attempt count checked
2. **Tokens Generated** → Access (15m) + Refresh (7d)
3. **Session Created** → Database session with user context
4. **Token Sent** → Access token in response, refresh in httpOnly cookie
5. **Request** → Bearer token validated via JWT strategy
6. **Refresh** → Expired token renewed, session rotated
7. **Logout** → All sessions invalidated

## 📊 Audit Logging

Every important action is logged:

```
USER_CREATED
USER_UPDATED
USER_BANNED
PERMISSION_GRANTED
PERMISSION_REVOKED
ROLE_CHANGED
LOGIN / LOGOUT / REFRESH_TOKEN
```

Fields tracked:
- Actor (who performed action)
- Target (what was affected)
- Action type
- Metadata
- IP address
- Timestamp

Query audit logs:
```bash
GET /audit-logs?action=LOGIN&startDate=2024-01-01&endDate=2024-01-31
```

## 🛠️ Development

### Available Scripts

```bash
# Start
pnpm run start:dev              # Development with hot reload
pnpm run start:prod             # Production server

# Build
pnpm run build                  # Build project

# Database
pnpm run prisma:migrate         # Run migrations
pnpm run prisma:studio          # Open Prisma Studio
pnpm run prisma:seed            # Seed data
pnpm run prisma:reset           # Reset database

# Code Quality
pnpm run lint                   # ESLint
pnpm run format                 # Prettier format

# Testing
pnpm run test                   # Jest tests
pnpm run test:watch             # Watch mode
pnpm run test:e2e               # E2E tests
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/rbac_db
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

JWT_SECRET=your-secret-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

BCRYPT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOGIN_ATTEMPT_RESET_MINUTES=15
```

## 🔌 Frontend Integration

### Login Request

```typescript
const response = await fetch('http://localhost:3001/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // For cookies
  body: JSON.stringify({ email, password }),
});

const { accessToken, user } = await response.json();
// Store accessToken in memory (not localStorage)
// Refresh token is in httpOnly cookie (automatic)
```

### Authenticated Request

```typescript
const response = await fetch('http://localhost:3001/api/v1/users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  credentials: 'include',
});
```

### Handle ExpiredToken & Refresh

```typescript
async function refreshAccessToken() {
  const response = await fetch('http://localhost:3001/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include', // Sends refresh token cookie
  });
  
  if (response.ok) {
    const { accessToken: newToken } = await response.json();
    return newToken;
  }
  // Redirect to login
}
```

## 📈 Scalability

### Production Deployment

1. **Environment**: Set `NODE_ENV=production`
2. **Secrets**: Use secrets manager for JWT_SECRET, DATABASE_URL
3. **Database**: Use managed PostgreSQL (AWS RDS, Heroku, etc.)
4. **Sessions**: Consider Redis for session management
5. **Rate Limiting**: Implement Redis-based rate limiting
6. **Monitoring**: Add logging (Winston, Datadog)
7. **SSL/TLS**: Enable HTTPS with valid certificates
8. **CORS**: Restrict to specific frontend domains

### Performance Optimization

- Database query optimization via Prisma
- Pagination on all list endpoints
- Permission caching considered
- JWT validation on each request
- Connection pooling via Prisma
- Index strategy on audit logs

## 🧪 Testing

```bash
# Unit tests
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage
pnpm run test:cov

# E2E tests
pnpm run test:e2e
```

## 📚 Documentation

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [JWT Authentication](https://jwt.io)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)

See [SETUP.md](./SETUP.md) for detailed setup instructions.

## 🤝 Contributing

Contributions welcome! Please follow:
1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

UNLICENSED

---

Built with ❤️ using NestJS, TypeScript, and PostgreSQL
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
