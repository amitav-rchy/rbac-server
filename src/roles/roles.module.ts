import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './services/roles.service';
import { PrismaService } from 'src/database/prisma.service';
import { AuditModule } from 'src/audit/audit.module';
import { PermissionsModule } from 'src/permissions/permissions.module';

@Module({
  imports: [AuditModule, PermissionsModule],
  controllers: [RolesController],
  providers: [RolesService, PrismaService],
  exports: [RolesService],
})
export class RolesModule {}
