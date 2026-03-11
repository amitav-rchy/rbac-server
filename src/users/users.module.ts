import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './services/users.service';
import { PrismaService } from 'src/database/prisma.service';
import { AuditModule } from 'src/audit/audit.module';
import { PermissionsModule } from 'src/permissions/permissions.module';

@Module({
  imports: [AuditModule, PermissionsModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
