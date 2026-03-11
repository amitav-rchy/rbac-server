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
import { RolesService } from './services/roles.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionToRoleDto,
} from './dto/role.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@Controller('roles')
@ApiTags('roles')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permission('view_roles')
  @UseGuards(PermissionGuard)
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permission('view_roles')
  @UseGuards(PermissionGuard)
  async findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @Permission('manage_roles')
  @UseGuards(PermissionGuard)
  async create(@Body() dto: CreateRoleDto, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.rolesService.createRole(dto, userId);
  }

  @Patch(':id')
  @Permission('manage_roles')
  @UseGuards(PermissionGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.rolesService.updateRole(id, dto, userId);
  }

  @Delete(':id')
  @Permission('manage_roles')
  @UseGuards(PermissionGuard)
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    await this.rolesService.deleteRole(id, userId);
    return { message: 'Role deleted' };
  }

  @Post(':id/permissions')
  @Permission('manage_roles')
  @UseGuards(PermissionGuard)
  async assignPermission(
    @Param('id') id: string,
    @Body() dto: AssignPermissionToRoleDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    await this.rolesService.assignPermissionToRole(id, dto, userId);
    return { message: 'Permission assigned to role' };
  }

  @Delete(':id/permissions/:permissionId')
  @Permission('manage_roles')
  @UseGuards(PermissionGuard)
  async removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    await this.rolesService.removePermissionFromRole(
      id,
      { permissionId },
      userId,
    );
    return { message: 'Permission removed from role' };
  }
}
