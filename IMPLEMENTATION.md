# RBAC Implementation Details

This document provides detailed information about the Dynamic RBAC system implementation.

## Core Concepts

### Atomic Permissions

Each feature in the system is protected by a single permission. This means:
- One permission per feature
- No permission hierarchies (e.g., `view_reports` ≠ `manage_reports`)
- Granular control at the feature level

**Example Permissions:**
```javascript
{
  'view_dashboard'      // View dashboard
  'manage_users'        // Full user management  
  'view_users'          // View user list
  'create_users'        // Create new user
  'view_leads'          // View leads
  'manage_leads'        // Create/update/delete leads
  'create_leads'        // Create new lead
  'manage_tasks'        // Full task management
  'view_reports'        // View reports
  'manage_reports'      // Create/delete reports
  'view_audit_logs'     // View audit logs
  'customer_portal_access' // Access customer portal
}
```

### Role Hierarchy

The system implements a four-level role hierarchy:

```
ADMIN (3)
  ├── Full system access
  ├── Can create/manage all users
  └── Can assign any permission

MANAGER (2)
  ├── Team management access
  ├── Can create agents/customers
  ├── Limited by permission ceiling
  └── Cannot assign permissions they don't have

AGENT (1)
  ├── Work access
  ├── Can manage assigned leads/tasks
  └── Limited feature access

CUSTOMER (0)
  ├── Portal access only
  └── Self-service features
```

### Permission Resolution

When a user accesses a resource, the system resolves their effective permissions:

```
Effective Permissions = Role Permissions + User Permission Overrides

Example:
User John (MANAGER):
├── Role Permissions: ['view_leads', 'manage_leads', 'view_tasks']
├── User Overrides:   [+manage_reports, -manage_leads]
└── Effective:        ['view_leads', 'view_tasks', 'manage_reports']
```

**Implementation:**
```typescript
// /src/permissions/services/permission.service.ts
async getUserPermissions(userId: string): Promise<string[]> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      assignedRole: {
        include: { permissions: { include: { permission: true } } }
      },
      userPermissions: {
        where: { isGranted: true },
        include: { permission: true }
      }
    }
  });

  const permissionSet = new Set<string>();
  
  // Add role permissions
  user.assignedRole?.permissions.forEach(rp => {
    permissionSet.add(rp.permission.name);
  });
  
  // Add user overrides
  user.userPermissions.forEach(up => {
    permissionSet.add(up.permission.name);
  });
  
  return Array.from(permissionSet);
}
```

## Authentication System

### 1. Login Flow

```
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "user": { ...user data }
}

(Refresh token set in httpOnly cookie)
```

**Implementation Details:**
- Password verified with bcrypt.compare()
- Login attempts tracked (max 5, resets after 15 min)
- Banned/suspended users rejected
- Session created with token hash
- Refresh token rotated on login

### 2. Access Token

- **Duration:** 15 minutes (configurable via JWT_ACCESS_EXPIRY)
- **Stored:** Memory on frontend (NOT localStorage to prevent XSS)
- **Sent:** Authorization header as Bearer token
- **Payload:** `{ sub, email, role, permissions }`

```
Authorization: Bearer eyJhbGc...
```

### 3. Refresh Token

- **Duration:** 7 days (configurable via JWT_REFRESH_EXPIRY)
- **Stored:** httpOnly + secure + sameSite=strict cookie
- **Updated:** Rotated on every refresh
- **Payload:** Same as access token

```
POST /auth/refresh
Response: { "accessToken": "new_token" }
// Refresh token cookie automatically updated
```

### 4. Session Management

Sessions stored in database:

```typescript
model Session {
  id                String
  userId            String
  refreshToken      String      @unique
  refreshTokenHash  String      // Hashed for security
  accessToken       String
  ipAddress         String
  userAgent         String
  isValid           Boolean     @default(true)
  expiresAt         DateTime
  revokedAt         DateTime    // Logout time
  createdAt         DateTime
  updatedAt         DateTime
}
```

**Session Lifecycle:**
1. **Created:** On login
2. **Updated:** On token refresh (token rotated)
3. **Validated:** On each request
4. **Invalidated:** On logout or user ban

### 5. Logout

```
POST /auth/logout
Response: { "message": "Logged out successfully" }

Actions performed:
1. All user sessions marked as invalid
2. Session revokedAt set to current time
3. Refresh token cookie cleared
4. Audit log entry created
```

## Permission Guards & Decorators

### Permission Decorator

```typescript
// /src/auth/decorators/permission.decorator.ts
export const Permission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);

// Usage in controller:
@Get('leads')
@Permission('view_leads')
@UseGuards(PermissionGuard)
async getLeads() { ... }
```

### Permission Guard

```typescript
// /src/auth/guards/permission.guard.ts
@Injectable()
export class PermissionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get(PERMISSION_KEY, ...);
    
    if (!requiredPermission) return true; // No permission required
    
    const user = request.user;
    const hasPermission = await this.permissionService
      .hasPermission(user.userId, requiredPermission);
    
    if (!hasPermission) {
      throw new ForbiddenException(
        `Required permission: ${requiredPermission}`
      );
    }
    
    return true;
  }
}
```

## Manager Permission Ceiling

Managers can only grant permissions they possess. This is enforced in the permission service:

```typescript
// /src/permissions/services/permission.service.ts
async grantPermissionToUser(userId, { permissionId }, actorId) {
  const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
  
  // Manager check
  if (actor.role === 'MANAGER') {
    const actorPermissions = await this.getUserPermissions(actor.id);
    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    
    // Manager must have the permission
    if (!actorPermissions.includes(permission.name)) {
      throw new ForbiddenException(
        'You cannot grant permissions you do not have'
      );
    }
  }
  
  // Grant permission...
}
```

## Audit Logging System

### Audit Log Model

```typescript
model AuditLog {
  id            String          @id
  action        AuditAction     // USER_CREATED, LOGIN, etc.
  actorId       String?         // Who performed the action
  targetId      String?         // Who/what was affected
  resourceType  String?         // User, Permission, etc.
  resourceId    String?         // ID of resource
  metadata      String?         // JSON data
  ipAddress     String?
  userAgent     String?
  status        String          // success, failure
  errorMessage  String?
  createdAt     DateTime        @default(now())
}
```

### Logged Actions

```
USER_CREATED, USER_UPDATED, USER_BANNED, USER_SUSPENDED, USER_ACTIVATED,
USER_PASSWORD_RESET, PERMISSION_GRANTED, PERMISSION_REVOKED, 
ROLE_CHANGED, LOGIN, LOGOUT, REFRESH_TOKEN
```

### Audit Service

```typescript
async log(dto: CreateAuditLogDto): Promise<void> {
  await this.prisma.auditLog.create({
    data: {
      action: dto.action,
      actorId: dto.actorId,
      targetId: dto.targetId,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      metadata: JSON.stringify(dto.metadata),
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      status: dto.status,
      errorMessage: dto.errorMessage,
    }
  });
}
```

### Querying Audit Logs

```
GET /audit-logs?action=LOGIN&startDate=2024-01-01&endDate=2024-01-31
GET /audit-logs?actorId=user123&targetId=user456
GET /audit-logs/user/user123
```

## User Management

### User Lifecycle

1. **Create:** Admin/Manager creates user with role and optional manager assignment
2. **Update:** User or admin updates profile
3. **Suspend:** Manager/admin temporarily disables account
4. **Ban:** Admin permanently disables account
5. **Activate:** Admin re-activates suspended user
6. **Delete:** Admin permanently removes user

### Access Control

- **Create:** Only Admin/Manager (Manager cannot create equal/higher role users)
- **View:** User can view self, Admin can view all, Manager can view team
- **Update:** User can update self, Admin can update all, Manager can update team
- **Delete:** Only Admin
- **Suspend:** Admin/Manager
- **Ban:** Only Admin

## Database Relationships

```
User (1) ──────────────┐
                       │
                    (1..N)
                       │
                  Role (1)─────────┐
                                   │
                              (1..N)
                                   │
                            Permission

UserPermission (Join)
├── userId
├── permissionId
├── isGranted
└── grantedBy (User who granted it)

RolePermission (Join)
├── roleId
└── permissionId
```

## Error Handling

### Global Exception Filter

```typescript
// /src/common/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = ctx.getResponse<Response>();
    
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse().message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal Server Error';
    }
    
    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### Response Transformation

```typescript
// /src/common/interceptors/transform.interceptor.ts
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }))
    );
  }
}
```

## Validation Pipeline

```typescript
// /src/main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Remove unknown properties
    forbidNonWhitelisted: true,   // Throw on unknown properties
    transform: true,              // Transform to DTO class
    transformOptions: {
      enableImplicitConversion: true
    },
  })
);
```

## Brute Force Protection

### Implementation

```typescript
const MAX_LOGIN_ATTEMPTS = 5;
const RESET_MINUTES = 15;

async login(email, password) {
  const user = await this.prisma.user.findUnique({ where: { email } });
  
  // Check attempts
  const resetTime = new Date(Date.now() - RESET_MINUTES * 60 * 1000);
  if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS && user.lastLoginAttemptAt > resetTime) {
    throw new UnauthorizedException('Too many login attempts');
  }
  
  // Reset if time has passed
  if (user.lastLoginAttemptAt < resetTime && user.loginAttempts > 0) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0 }
    });
  }
  
  // Verify password
  if (!await bcrypt.compare(password, user.password)) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: user.loginAttempts + 1,
        lastLoginAttemptAt: new Date()
      }
    });
    throw new UnauthorizedException('Invalid credentials');
  }
  
  // Reset on success
  await this.prisma.user.update({
    where: { id: user.id },
    data: { loginAttempts: 0, lastLoginAt: new Date() }
  });
  // ... rest of login
}
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-03-11T10:30:00.000Z"
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-03-11T10:30:00.000Z",
  "path": "/api/v1/users"
}
```

## Performance Considerations

### Database Optimization

- Indexes on frequently queried columns
- Efficient permission resolution caching
- Pagination on all list endpoints
- Connection pooling via Prisma

### JWT Security

- Short-lived access tokens (15m)
- Refresh tokens in httpOnly cookies
- Token rotation on refresh
- Session validation on each request

### Rate Limiting Ready

Configure in `.env`:
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=30
```

## Production Deployment Checklist

- [ ] Update JWT_SECRET to strong random value
- [ ] Update SESSION_SECRET
- [ ] Set NODE_ENV=production
- [ ] Configure DATABASE_URL for production database
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production frontend
- [ ] Set up monitoring/logging
- [ ] Configure rate limiting
- [ ] Set up database backups
- [ ] Enable audit log archival
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Set up health checks
- [ ] Configure CDN if needed
- [ ] Document API for team

---

For API usage examples, see [README.md](./README.md)  
For setup instructions, see [SETUP.md](./SETUP.md)
