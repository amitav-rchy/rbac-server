import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { TasksService } from './services/tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@Controller('tasks')
@ApiTags('tasks')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Permission('view_tasks')
  @UseGuards(PermissionGuard)
  async findAll(
    @Req() req: Request,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const userId = (req.user as any).userId;
    return this.tasksService.findAll(userId, parseInt(skip || '0'), parseInt(take || '10'));
  }

  @Get(':id')
  @Permission('view_tasks')
  @UseGuards(PermissionGuard)
  async findById(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.tasksService.findById(id, userId);
  }

  @Post()
  @Permission('manage_tasks')
  @UseGuards(PermissionGuard)
  async create(@Body() dto: CreateTaskDto, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.tasksService.create(dto, userId);
  }

  @Patch(':id')
  @Permission('manage_tasks')
  @UseGuards(PermissionGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.tasksService.update(id, dto, userId);
  }

  @Delete(':id')
  @Permission('manage_tasks')
  @UseGuards(PermissionGuard)
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    await this.tasksService.delete(id, userId);
    return { message: 'Task deleted' };
  }
}
