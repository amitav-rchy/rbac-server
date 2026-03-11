import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { PrismaService } from 'src/database/prisma.service';
import { PermissionsModule } from 'src/permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [DashboardController],
  providers: [PrismaService],
})
export class DashboardModule {}
