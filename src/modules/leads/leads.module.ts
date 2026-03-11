import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './services/leads.service';
import { PrismaService } from 'src/database/prisma.service';
import { PermissionsModule } from 'src/permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [LeadsController],
  providers: [LeadsService, PrismaService],
  exports: [LeadsService],
})
export class LeadsModule {}
