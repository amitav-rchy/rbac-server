import { Module, forwardRef } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionService } from './services/permission.service';
import { PrismaService } from 'src/database/prisma.service';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [forwardRef(() => AuditModule)],
  controllers: [PermissionsController],
  providers: [PermissionService, PrismaService],
  exports: [PermissionService],
})
export class PermissionsModule {}
