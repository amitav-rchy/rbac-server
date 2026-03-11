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

@Controller('customer-portal')
@ApiTags('customer-portal')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CustomerPortalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard')
  @Permission('customer_portal_access')
  @UseGuards(PermissionGuard)
  async getDashboard(@Req() req: Request) {
    const userId = (req.user as any).userId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== UserRole.CUSTOMER) {
      throw new Error('Access denied');
    }

    // Get customer-specific data
    const leads = await this.prisma.lead.findMany({
      where: { assignedToId: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const tasks = await this.prisma.task.findMany({
      where: { assignedToId: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      leads,
      tasks,
      stats: {
        totalLeads: await this.prisma.lead.count({
          where: { assignedToId: userId },
        }),
        totalTasks: await this.prisma.task.count({
          where: { assignedToId: userId },
        }),
        completedTasks: await this.prisma.task.count({
          where: { assignedToId: userId, status: 'done' },
        }),
      },
    };
  }

  @Get('profile')
  @Permission('customer_portal_access')
  @UseGuards(PermissionGuard)
  async getProfile(@Req() req: Request) {
    const userId = (req.user as any).userId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    return user;
  }
}
