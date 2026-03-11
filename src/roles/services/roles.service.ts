import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionToRoleDto,
  RemovePermissionFromRoleDto,
} from '../dto/role.dto';
import { AuditService } from 'src/audit/services/audit.service';
import { UserRole } from 'src/common/constants';
import { AuditAction } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createRole(dto: CreateRoleDto, actorId: string): Promise<any> {
    // Only admin can create roles
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor || actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create roles');
    }

    // Check if role already exists
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Role with this name already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        hierarchy: 0, // Default hierarchy, can be changed
      },
    });

    // Add permissions if provided
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      await Promise.all(
        dto.permissionIds.map((permissionId) =>
          this.prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId,
            },
          }).catch(() => {
            // Silently ignore if permission doesn't exist
          }),
        ),
      );
    }

    // Log audit
    await this.auditService.log({
      action: AuditAction.ROLE_CHANGED,
      actorId,
      resourceType: 'Role',
      resourceId: role.id,
      metadata: dto,
      status: 'success',
    });

    return this.toResponseDto(role);
  }

  async findAll(skip = 0, take = 100): Promise<any> {
    const roles = await this.prisma.role.findMany({
      skip,
      take,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map((r) => this.toResponseDtoWithPermissions(r));
  }

  async findById(id: string): Promise<any> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.toResponseDtoWithPermissions(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto, actorId: string): Promise<any> {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Only admin can update roles
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor || actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update roles');
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.ROLE_CHANGED,
      actorId,
      resourceType: 'Role',
      resourceId: id,
      metadata: dto,
      status: 'success',
    });

    return this.toResponseDtoWithPermissions(updated);
  }

  async deleteRole(id: string, actorId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Only admin can delete roles
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor || actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete roles');
    }

    // Check if role is in use
    const usersWithRole = await this.prisma.user.count({
      where: { roleId: id },
    });

    if (usersWithRole > 0) {
      throw new BadRequestException('Cannot delete role that is assigned to users');
    }

    await this.prisma.role.delete({
      where: { id },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.ROLE_CHANGED,
      actorId,
      resourceType: 'Role',
      resourceId: id,
      metadata: { deleted: true },
      status: 'success',
    });
  }

  async assignPermissionToRole(
    roleId: string,
    dto: AssignPermissionToRoleDto,
    actorId: string,
  ): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id: dto.permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Only admin can assign permissions to roles
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor || actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can assign permissions to roles');
    }

    // Check if permission is already assigned
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: dto.permissionId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Permission is already assigned to this role');
    }

    await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId: dto.permissionId,
      },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.PERMISSION_GRANTED,
      actorId,
      resourceType: 'RolePermission',
      resourceId: `${roleId}-${dto.permissionId}`,
      metadata: { roleId, permissionId: dto.permissionId },
      status: 'success',
    });
  }

  async removePermissionFromRole(
    roleId: string,
    dto: RemovePermissionFromRoleDto,
    actorId: string,
  ): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id: dto.permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Only admin can remove permissions from roles
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor || actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can remove permissions from roles');
    }

    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: dto.permissionId,
        },
      },
    });

    if (!rolePermission) {
      throw new NotFoundException('Permission not assigned to this role');
    }

    await this.prisma.rolePermission.delete({
      where: { id: rolePermission.id },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.PERMISSION_REVOKED,
      actorId,
      resourceType: 'RolePermission',
      resourceId: `${roleId}-${dto.permissionId}`,
      metadata: { roleId, permissionId: dto.permissionId },
      status: 'success',
    });
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return [];
    }

    return role.permissions.map((rp) => rp.permission.name);
  }

  private toResponseDto(role: any) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      hierarchy: role.hierarchy,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  private toResponseDtoWithPermissions(role: any) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      hierarchy: role.hierarchy,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        category: rp.permission.category,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
