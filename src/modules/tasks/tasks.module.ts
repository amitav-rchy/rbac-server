import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './services/tasks.service';
import { PrismaService } from 'src/database/prisma.service';
import { PermissionsModule } from 'src/permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [TasksController],
  providers: [TasksService, PrismaService],
  exports: [TasksService],
})
export class TasksModule {}
