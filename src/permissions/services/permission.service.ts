import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  GrantPermissionDto,
  RevokePermissionDto,
} from '../dto/permission.dto';
import { AuditService } from 'src/audit/services/audit.service';
import { UserRole } from 'src/common/constants';
import { AuditAction } from '@prisma/client';

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createPermission(dto: CreatePermissionDto, actorId: string): Promise<any> {
    // Only admin can create permissions
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor) {
      throw new NotFoundException('Actor user not found');
    }

    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create permissions');
    }

    // Check if permission already exists
    const existing = await this.prisma.permission.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Permission with this name already exists');
    }

    const permission = await this.prisma.permission.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
      },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.PERMISSION_GRANTED,
      actorId,
      resourceType: 'Permission',
      resourceId: permission.id,
      metadata: dto,
      status: 'success',
    });

    return this.toResponseDto(permission);
  }

  async findAll(skip = 0, take = 100): Promise<any> {
    const permissions = await this.prisma.permission.findMany({
      skip,
      take,
      orderBy: { category: 'asc' },
    });

    return permissions.map((p) => this.toResponseDto(p));
  }

  async findById(id: string): Promise<any> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return this.toResponseDto(permission);
  }

  async updatePermission(
    id: string,
    dto: UpdatePermissionDto,
    actorId: string,
  ): Promise<any> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Only admin can update permissions
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor || actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update permissions');
    }

    // Cannot modify system permissions
    if (permission.isSystem) {
      throw new ForbiddenException('Cannot modify system permissions');
    }

    const updated = await this.prisma.permission.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
      },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.PERMISSION_GRANTED,
      actorId,
      resourceType: 'Permission',
      resourceId: id,
      metadata: dto,
      status: 'success',
    });

    return this.toResponseDto(updated);
  }

  async deletePermission(id: string, actorId: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Only admin can delete permissions
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor || actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete permissions');
    }

    // Cannot delete system permissions
    if (permission.isSystem) {
      throw new ForbiddenException('Cannot delete system permissions');
    }

    await this.prisma.permission.delete({
      where: { id },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.PERMISSION_REVOKED,
      actorId,
      resourceType: 'Permission',
      resourceId: id,
      status: 'success',
    });
  }

  // Grant a permission to a user (override)
  async grantPermissionToUser(
    userId: string,
    dto: GrantPermissionDto,
    actorId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id: dto.permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor) {
      throw new NotFoundException('Actor user not found');
    }

    // Check if manager can grant this permission
    if (actor.role === 'MANAGER') {
      // Manager must have the permission themselves
      const actorPermissions = await this.getUserPermissions(actor.id);
      if (!actorPermissions.includes(permission.name)) {
        throw new ForbiddenException(
          'You cannot grant permissions you do not have',
        );
      }
    } else if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to grant permissions');
    }

    // Check if override already exists
    const existing = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId: dto.permissionId,
        },
      },
    });

    if (existing) {
      // Update existing
      await this.prisma.userPermission.update({
        where: { id: existing.id },
        data: {
          isGranted: true,
          revokedAt: null,
          grantedBy: actorId,
          reason: dto.reason,
        },
      });
    } else {
      // Create new
      await this.prisma.userPermission.create({
        data: {
          userId,
          permissionId: dto.permissionId,
          isGranted: true,
          grantedBy: actorId,
          reason: dto.reason,
        },
      });
    }

    // Log audit
    await this.auditService.log({
      action: AuditAction.PERMISSION_GRANTED,
      actorId,
      targetId: userId,
      resourceType: 'UserPermission',
      resourceId: `${userId}-${dto.permissionId}`,
      metadata: { permissionId: dto.permissionId, reason: dto.reason },
      status: 'success',
    });
  }

  // Revoke a permission from a user (override)
  async revokePermissionFromUser(
    userId: string,
    dto: RevokePermissionDto,
    actorId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id: dto.permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'MANAGER')) {
      throw new ForbiddenException('You do not have permission to revoke permissions');
    }

    const override = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId: dto.permissionId,
        },
      },
    });

    if (!override) {
      throw new NotFoundException('Permission override not found');
    }

    // Mark as revoked
    await this.prisma.userPermission.update({
      where: { id: override.id },
      data: {
        isGranted: false,
        revokedAt: new Date(),
      },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.PERMISSION_REVOKED,
      actorId,
      targetId: userId,
      resourceType: 'UserPermission',
      resourceId: `${userId}-${dto.permissionId}`,
      metadata: { permissionId: dto.permissionId },
      status: 'success',
    });
  }

  // Get all effective permissions for a user
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignedRole: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        userPermissions: {
          where: { isGranted: true },
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    const permissionSet = new Set<string>();

    // Add role permissions
    if (user.assignedRole) {
      user.assignedRole.permissions.forEach((rp) => {
        permissionSet.add(rp.permission.name);
      });
    }

    // Add user permission overrides
    user.userPermissions.forEach((up) => {
      permissionSet.add(up.permission.name);
    });

    return Array.from(permissionSet);
  }

  // Check if user has a specific permission
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permissionName);
  }

  private toResponseDto(permission: any) {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      category: permission.category,
      isSystem: permission.isSystem,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }
}
