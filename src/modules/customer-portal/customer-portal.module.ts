import { Module } from '@nestjs/common';
import { CustomerPortalController } from './customer-portal.controller';
import { PrismaService } from 'src/database/prisma.service';
import { PermissionsModule } from 'src/permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [CustomerPortalController],
  providers: [PrismaService],
})
export class CustomerPortalModule {}
