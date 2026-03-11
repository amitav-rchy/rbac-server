import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/database/prisma.service';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from '../dto/user.dto';
import { AuditService } from 'src/audit/services/audit.service';
import { PermissionService } from 'src/permissions/services/permission.service';
import { UserRole, ROLE_HIERARCHY } from 'src/common/constants';
import { AuditAction } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly permissionService: PermissionService,
  ) {}

  async create(dto: CreateUserDto, actorId: string): Promise<any> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    // Verify actor can create users
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor) {
      throw new NotFoundException('Actor user not found');
    }

    // Only Admin and Manager can create users
    if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MANAGER) {
      throw new ForbiddenException('You do not have permission to create users');
    }

    // Managers cannot create users of roles higher than theirs
    if (actor.role === UserRole.MANAGER) {
      const actorHierarchy = ROLE_HIERARCHY[actor.role];
      const targetHierarchy = ROLE_HIERARCHY[dto.role || UserRole.AGENT];
      if (targetHierarchy >= actorHierarchy) {
        throw new ForbiddenException('You cannot create users of equal or higher role');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      dto.password,
      parseInt(process.env.BCRYPT_ROUNDS || '10'),
    );

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || UserRole.AGENT,
        managerId: dto.managerId,
        status: 'ACTIVE',
      },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.USER_CREATED,
      actorId,
      targetId: user.id,
      resourceType: 'User',
      resourceId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
      },
      status: 'success',
    });

    return this.toResponseDto(user);
  }

  async findAll(actorId: string, skip = 0, take = 10): Promise<any> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor) {
      throw new NotFoundException('Actor user not found');
    }

    // Admin can see all users
    // Manager can see their team
    // Others cannot list users
    if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MANAGER) {
      throw new ForbiddenException('You do not have permission to list users');
    }

    let where: any = {};
    if (actor.role === UserRole.MANAGER) {
      where = {
        OR: [{ managerId: actor.id }, { id: actor.id }],
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users;
  }

  async findById(id: string, actorId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Users can see themselves
    // Admins can see everyone
    // Managers can see their team
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor) {
      throw new NotFoundException('Actor user not found');
    }

    if (
      actorId !== id &&
      actor.role !== UserRole.ADMIN &&
      (actor.role !== UserRole.MANAGER || user.managerId !== actorId)
    ) {
      throw new ForbiddenException('You do not have permission to view this user');
    }

    return this.toResponseDto(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorId: string,
  ): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor) {
      throw new NotFoundException('Actor user not found');
    }

    // Verify permissions
    if (
      actorId !== id &&
      actor.role !== UserRole.ADMIN &&
      (actor.role !== UserRole.MANAGER || user.managerId !== actor.id)
    ) {
      throw new ForbiddenException('You do not have permission to update this user');
    }

    // Check for email/username conflicts
    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    if (dto.username && dto.username !== user.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (existing) {
        throw new ConflictException('Username already in use');
      }
    }

    // Prevent role changes by non-admins
    if (dto.role && dto.role !== user.role && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can change user roles');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        username: dto.username,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        managerId: dto.managerId,
      },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.USER_UPDATED,
      actorId,
      targetId: id,
      resourceType: 'User',
      resourceId: id,
      metadata: dto,
      status: 'success',
    });

    return this.toResponseDto(updated);
  }

  async delete(id: string, actorId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor) {
      throw new NotFoundException('Actor user not found');
    }

    // Only admin can delete users permanently
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete users');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.USER_UPDATED,
      actorId,
      targetId: id,
      resourceType: 'User',
      resourceId: id,
      metadata: { deleted: true },
      status: 'success',
    });
  }

  async suspend(id: string, actorId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor) {
      throw new NotFoundException('Actor user not found');
    }

    // Only admin and manager can suspend
    if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MANAGER) {
      throw new ForbiddenException('You do not have permission to suspend users');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
      },
    });

    // Invalidate all sessions
    await this.prisma.session.updateMany({
      where: { userId: id },
      data: { isValid: false },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.USER_SUSPENDED,
      actorId,
      targetId: id,
      resourceType: 'User',
      resourceId: id,
      status: 'success',
    });

    return this.toResponseDto(updated);
  }

  async ban(id: string, actorId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor) {
      throw new NotFoundException('Actor user not found');
    }

    // Only admin can ban
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can ban users');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: 'BANNED',
      },
    });

    // Invalidate all sessions
    await this.prisma.session.updateMany({
      where: { userId: id },
      data: { isValid: false },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.USER_BANNED,
      actorId,
      targetId: id,
      resourceType: 'User',
      resourceId: id,
      status: 'success',
    });

    return this.toResponseDto(updated);
  }

  async activate(id: string, actorId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor) {
      throw new NotFoundException('Actor user not found');
    }

    // Only admin can activate
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can activate users');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
      },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.USER_CREATED,
      actorId,
      targetId: id,
      resourceType: 'User',
      resourceId: id,
      metadata: { activated: true },
      status: 'success',
    });

    return this.toResponseDto(updated);
  }

  async resetPassword(
    userId: string,
    dto: ResetPasswordDto,
    actorId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });

    if (!actor) {
      throw new NotFoundException('Actor user not found');
    }

    // Users can reset their own password
    // Only admin can reset other users' passwords
    if (actorId !== userId && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to reset this password');
    }

    const hashedPassword = await bcrypt.hash(
      dto.newPassword,
      parseInt(process.env.BCRYPT_ROUNDS || '10'),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    // Invalidate all sessions for security
    await this.prisma.session.updateMany({
      where: { userId },
      data: { isValid: false },
    });

    // Log audit
    await this.auditService.log({
      action: AuditAction.USER_PASSWORD_RESET,
      actorId,
      targetId: userId,
      resourceType: 'User',
      resourceId: userId,
      status: 'success',
    });
  }

  private toResponseDto(user: any) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      managerId: user.managerId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
