import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { PermissionService } from './services/permission.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  GrantPermissionDto,
  RevokePermissionDto,
} from './dto/permission.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

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
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
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
  @ApiResponse({
    status: 200,
    description: 'Permission retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Permission not found',
  })
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
  @ApiResponse({
    status: 201,
    description: 'Permission created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async create(@Body() dto: CreatePermissionDto, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.permissionService.createPermission(dto, userId);
  }

  @Patch(':id')
  @Permission('manage_permissions')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Update permission',
    description: 'Update an existing permission',
  })
  @ApiParam({ name: 'id', type: String, description: 'Permission ID' })
  @ApiBody({ type: UpdatePermissionDto })
  @ApiResponse({
    status: 200,
    description: 'Permission updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.permissionService.updatePermission(id, dto, userId);
  }

  @Delete(':id')
  @Permission('manage_permissions')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Delete permission',
    description: 'Delete a permission permanently',
  })
  @ApiParam({ name: 'id', type: String, description: 'Permission ID' })
  @ApiResponse({
    status: 200,
    description: 'Permission deleted successfully',
  })
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    await this.permissionService.deletePermission(id, userId);
    return { message: 'Permission deleted' };
  }

  @Post('users/:userId/grant')
  @Permission('manage_users')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Grant permission to user',
    description: 'Grant a specific permission to a user',
  })
  @ApiParam({ name: 'userId', type: String, description: 'User ID' })
  @ApiBody({ type: GrantPermissionDto })
  @ApiResponse({
    status: 200,
    description: 'Permission granted successfully',
  })
  async grantToUser(
    @Param('userId') userId: string,
    @Body() dto: GrantPermissionDto,
    @Req() req: Request,
  ) {
    const actorId = (req.user as any).userId;
    await this.permissionService.grantPermissionToUser(userId, dto, actorId);
    return { message: 'Permission granted' };
  }

  @Post('users/:userId/revoke')
  @Permission('manage_users')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Revoke permission from user',
    description: 'Remove a specific permission from a user',
  })
  @ApiParam({ name: 'userId', type: String, description: 'User ID' })
  @ApiBody({ type: RevokePermissionDto })
  @ApiResponse({
    status: 200,
    description: 'Permission revoked successfully',
  })
  async revokeFromUser(
    @Param('userId') userId: string,
    @Body() dto: RevokePermissionDto,
    @Req() req: Request,
  ) {
    const actorId = (req.user as any).userId;
    await this.permissionService.revokePermissionFromUser(userId, dto, actorId);
    return { message: 'Permission revoked' };
  }
}
