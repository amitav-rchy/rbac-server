import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateAuditLogDto, AuditLogFilterDto } from '../dto/audit.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto): Promise<any> {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        action: dto.action,
        actorId: dto.actorId,
        targetId: dto.targetId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        status: dto.status,
        errorMessage: dto.errorMessage,
      },
    });

    return this.toResponseDto(auditLog);
  }

  async findAll(filter: AuditLogFilterDto): Promise<any> {
    const where: any = {};

    if (filter.action) {
      where.action = filter.action;
    }
    if (filter.actorId) {
      where.actorId = filter.actorId;
    }
    if (filter.targetId) {
      where.targetId = filter.targetId;
    }
    if (filter.resourceType) {
      where.resourceType = filter.resourceType;
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where,
      skip: filter.skip || 0,
      take: filter.take || 50,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        target: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return auditLogs.map((log) => this.toResponseDtoWithRelations(log));
  }

  async findById(id: string): Promise<any> {
    const auditLog = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        target: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!auditLog) {
      throw new NotFoundException('Audit log not found');
    }

    return this.toResponseDtoWithRelations(auditLog);
  }

  async getUserAuditLogs(
    userId: string,
    skip = 0,
    take = 50,
  ): Promise<any> {
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [{ actorId: userId }, { targetId: userId }],
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        target: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return auditLogs.map((log) => this.toResponseDtoWithRelations(log));
  }

  async getSystemAuditLogs(skip = 0, take = 50): Promise<any> {
    const auditLogs = await this.prisma.auditLog.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        target: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return auditLogs.map((log) => this.toResponseDtoWithRelations(log));
  }

  private toResponseDto(auditLog: any) {
    return {
      id: auditLog.id,
      action: auditLog.action,
      actorId: auditLog.actorId,
      targetId: auditLog.targetId,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      metadata: auditLog.metadata ? JSON.parse(auditLog.metadata) : null,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      status: auditLog.status,
      errorMessage: auditLog.errorMessage,
      createdAt: auditLog.createdAt,
    };
  }

  private toResponseDtoWithRelations(auditLog: any) {
    return {
      ...this.toResponseDto(auditLog),
      actor: auditLog.actor,
      target: auditLog.target,
    };
  }
}
