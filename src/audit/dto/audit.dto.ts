import { IsOptional, IsEnum } from 'class-validator';
import { AuditAction } from '@prisma/client';

export class CreateAuditLogDto {
  action: AuditAction;

  @IsOptional()
  actorId?: string;

  @IsOptional()
  targetId?: string;

  @IsOptional()
  resourceType?: string;

  @IsOptional()
  resourceId?: string;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  ipAddress?: string;

  @IsOptional()
  userAgent?: string;

  status: string;

  @IsOptional()
  errorMessage?: string;
}

export class AuditLogResponseDto {
  id: string;
  action: AuditAction;
  actorId?: string;
  targetId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  status: string;
  errorMessage?: string;
  createdAt: Date;
}

export class AuditLogFilterDto {
  @IsOptional()
  action?: AuditAction;

  @IsOptional()
  actorId?: string;

  @IsOptional()
  targetId?: string;

  @IsOptional()
  resourceType?: string;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;

  @IsOptional()
  skip?: number;

  @IsOptional()
  take?: number;
}
