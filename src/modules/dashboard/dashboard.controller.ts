import {
  Controller,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { PrismaService } from 'src/database/prisma.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { UserRole } from 'src/common/constants';

@Controller('dashboard')
@ApiTags('dashboard')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permission('view_dashboard')
  @UseGuards(PermissionGuard)
  async getDashboard(@Req() req: Request) {
    const userId = (req.user as any).userId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Admin dashboard
    if (user!.role === UserRole.ADMIN) {
      const totalUsers = await this.prisma.user.count();
      const totalLeads = await this.prisma.lead.count();
      const totalTasks = await this.prisma.task.count();
      const activeRoles = await this.prisma.role.count();
      const totalPermissions = await this.prisma.permission.count();

      const recentAuditLogs = await this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, email: true, username: true },
          },
        },
      });

      return {
        userRole: user!.role,
        stats: {
          totalUsers,
          totalLeads,
          totalTasks,
          activeRoles,
          totalPermissions,
        },
        recentActivity: recentAuditLogs,
      };
    }

    // Manager dashboard
    if (user!.role === UserRole.MANAGER) {
      const teamMembers = await this.prisma.user.count({
        where: { managerId: userId },
      });

      const teamLeads = await this.prisma.lead.count({
        where: {
          assignedTo: {
            managerId: userId,
          },
        },
      });

      const teamTasks = await this.prisma.task.count({
        where: {
          assignedTo: {
            managerId: userId,
          },
        },
      });

      const myLeads = await this.prisma.lead.findMany({
        where: { assignedToId: userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      return {
        userRole: user!.role,
        stats: {
          teamMembers,
          teamLeads,
          teamTasks,
        },
        recentLeads: myLeads,
      };
    }

    // Agent/Customer dashboard
    const myLeads = await this.prisma.lead.count({
      where: { assignedToId: userId },
    });

    const myTasks = await this.prisma.task.count({
      where: { assignedToId: userId },
    });

    const completedTasks = await this.prisma.task.count({
      where: { assignedToId: userId, status: 'done' },
    });

    const recentTasks = await this.prisma.task.findMany({
      where: { assignedToId: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return {
      userRole: user!.role,
      stats: {
        totalLeads: myLeads,
        totalTasks: myTasks,
        completedTasks,
      },
      recentTasks,
    };
  }
}
