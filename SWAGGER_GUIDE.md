# Swagger Documentation Guide

This guide explains how to add comprehensive Swagger/OpenAPI documentation to all endpoints in the RBAC system.

## Overview

Swagger documentation has been added to the following controllers:
- ✅ Auth Controller (complete)
- ✅ Users Controller (complete)
- 🔄 Permissions Controller (in progress)
- 📋 To be completed: Roles, Audit, Leads, Tasks, Reports, Dashboard, Settings, Customer Portal

## Required Imports

Add these imports to your controller:

```typescript
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
```

## Decorator Patterns

### 1. GET Endpoints (List)

```typescript
@Get()
@ApiOperation({
  summary: 'List items',
  description: 'Retrieve paginated list of items',
})
@ApiQuery({ name: 'skip', type: String, required: false, description: 'Records to skip' })
@ApiQuery({ name: 'take', type: String, required: false, description: 'Records to take' })
@ApiOkResponse({
  status: 200,
  description: 'Items retrieved successfully',
  schema: {
    example: {
      data: [],
      total: 0,
      skip: 0,
      take: 10,
    },
  },
})
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
async findAll(
  @Query('skip') skip?: string,
  @Query('take') take?: string,
) {
  // Implementation
}
```

### 2. GET Endpoints (By ID)

```typescript
@Get(':id')
@ApiOperation({
  summary: 'Get item by ID',
  description: 'Retrieve a specific item by its ID',
})
@ApiParam({ name: 'id', type: String, description: 'Item ID' })
@ApiOkResponse({
  status: 200,
  description: 'Item retrieved successfully',
})
@ApiNotFoundResponse({
  status: 404,
  description: 'Item not found',
})
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
async findById(@Param('id') id: string) {
  // Implementation
}
```

### 3. POST Endpoints (Create)

```typescript
@Post()
@Permission('create_items')
@UseGuards(PermissionGuard)
@ApiOperation({
  summary: 'Create item',
  description: 'Create a new item. Requires create_items permission.',
})
@ApiBody({ type: CreateItemDto })
@ApiCreatedResponse({
  status: 201,
  description: 'Item created successfully',
})
@ApiBadRequestResponse({
  status: 400,
  description: 'Invalid input data',
})
@ApiForbiddenResponse({
  status: 403,
  description: 'Insufficient permissions',
})
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
async create(@Body() dto: CreateItemDto) {
  // Implementation
}
```

### 4. PATCH Endpoints (Update)

```typescript
@Patch(':id')
@Permission('update_items')
@UseGuards(PermissionGuard)
@ApiOperation({
  summary: 'Update item',
  description: 'Update an existing item. Requires update_items permission.',
})
@ApiParam({ name: 'id', type: String, description: 'Item ID' })
@ApiBody({ type: UpdateItemDto })
@ApiOkResponse({
  status: 200,
  description: 'Item updated successfully',
})
@ApiNotFoundResponse({
  status: 404,
  description: 'Item not found',
})
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
async update(
  @Param('id') id: string,
  @Body() dto: UpdateItemDto,
) {
  // Implementation
}
```

### 5. DELETE Endpoints

```typescript
@Delete(':id')
@Permission('delete_items')
@UseGuards(PermissionGuard)
@ApiOperation({
  summary: 'Delete item',
  description: 'Delete an item permanently. Requires delete_items permission.',
})
@ApiParam({ name: 'id', type: String, description: 'Item ID' })
@ApiOkResponse({
  status: 200,
  description: 'Item deleted successfully',
})
@ApiNotFoundResponse({
  status: 404,
  description: 'Item not found',
})
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
async delete(@Param('id') id: string) {
  // Implementation
}
```

## Common Response Examples

### Success Response

```typescript
@ApiOkResponse({
  status: 200,
  description: 'Success',
  schema: {
    example: {
      id: 'uuid-string',
      name: 'Example Name',
      createdAt: '2026-03-11T00:00:00Z',
      updatedAt: '2026-03-11T00:00:00Z',
    },
  },
})
```

### Error Responses

```typescript
@ApiBadRequestResponse({
  status: 400,
  description: 'Invalid input',
})
@ApiUnauthorizedResponse({
  status: 401,
  description: 'Unauthorized - invalid or missing token',
})
@ApiForbiddenResponse({
  status: 403,
  description: 'Forbidden - insufficient permissions',
})
@ApiConflictResponse({
  status: 409,
  description: 'Conflict - resource already exists',
})
@ApiNotFoundResponse({
  status: 404,
  description: 'Not found',
})
```

## Controller-Level Decorators

Apply these at the class level:

```typescript
@Controller('items')
@ApiTags('items')  // Groups endpoints in Swagger UI
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()   // Indicates all endpoints require Bearer token
export class ItemsController {
  // ...
}
```

## Complete Example: Permissions Controller

Here's a complete example with comprehensive Swagger documentation:

```typescript
@Controller('permissions')
@ApiTags('permissions')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @ApiOperation({
    summary: 'List all permissions',
    description: 'Retrieve all available system permissions',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
    schema: {
      example: [
        {
          id: 'perm-1',
          name: 'view_dashboard',
          description: 'View dashboard',
          category: 'dashboard',
          system: true,
        },
      ],
    },
  })
  async findAll() {
    return this.permissionService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get permission by ID',
    description: 'Retrieve a specific permission by its ID',
  })
  @ApiParam({ name: 'id', type: String, description: 'Permission ID' })
  @ApiOkResponse({ status: 200, description: 'Permission retrieved' })
  @ApiNotFoundResponse({ status: 404, description: 'Permission not found' })
  async findById(@Param('id') id: string) {
    return this.permissionService.findById(id);
  }

  @Post()
  @Permission('manage_permissions')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Create permission',
    description: 'Create a new permission (admin only)',
  })
  @ApiBody({ type: CreatePermissionDto })
  @ApiCreatedResponse({ status: 201, description: 'Permission created' })
  @ApiForbiddenResponse({ status: 403, description: 'Insufficient permissions' })
  async create(@Body() dto: CreatePermissionDto) {
    return this.permissionService.createPermission(dto);
  }
}
```

## Accessing Swagger UI

Once the server is running:

```
http://localhost:3001/api/docs
```

## Common HTTP Status Codes

- **200**: OK - Request succeeded
- **201**: Created - Resource created successfully
- **400**: Bad Request - Invalid input
- **401**: Unauthorized - Missing/invalid authentication
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource not found
- **409**: Conflict - Resource already exists
- **500**: Internal Server Error

## Tips

1. **Be descriptive**: Use clear summary and description fields
2. **Include examples**: Provide realistic example responses
3. **Document permissions**: Always document required permissions
4. **Error cases**: Document all possible error responses
5. **Keep DTOs updated**: Ensure DTOs match actual request/response bodies

## Next Steps

To complete Swagger documentation for remaining controllers:

1. Add imports to each controller
2. Apply `@ApiTags()` at class level
3. Add `@ApiOperation()` to each endpoint
4. Add `@ApiResponse()` decorators for all expected responses
5. Add `@ApiParam()` for URL parameters
6. Add `@ApiQuery()` for query parameters
7. Add `@ApiBody()` for request bodies

All files should be documented following these patterns:
- Roles Controller
- Audit Controller
- Leads Controller
- Tasks Controller
- Reports Controller
- Dashboard Controller
- Settings Controller
- Customer Portal Controller
