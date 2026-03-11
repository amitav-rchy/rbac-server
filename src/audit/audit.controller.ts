import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './services/audit.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@Controller('audit-logs')
@ApiTags('audit')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permission('view_audit_logs')
  @UseGuards(PermissionGuard)
  async findAll(
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('targetId') targetId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const filter = {
      action: action as any,
      actorId,
      targetId,
      resourceType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 50,
    };

    return this.auditService.findAll(filter);
  }

  @Get(':id')
  @Permission('view_audit_logs')
  @UseGuards(PermissionGuard)
  async findById(@Param('id') id: string) {
    return this.auditService.findById(id);
  }

  @Get('user/:userId')
  @Permission('view_audit_logs')
  @UseGuards(PermissionGuard)
  async getUserAuditLogs(
    @Param('userId') userId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.auditService.getUserAuditLogs(
      userId,
      parseInt(skip || '0'),
      parseInt(take || '50'),
    );
  }
}
