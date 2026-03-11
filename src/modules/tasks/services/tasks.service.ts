import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from '../dto/task.dto';
import { UserRole } from 'src/common/constants';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskDto, userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'medium',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assignedToId: userId,
      },
    });

    return this.toResponseDto(task);
  }

  async findAll(userId: string, skip = 0, take = 10): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let where: any = {};

    // Non-managers see only their assigned tasks
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
      where = { assignedToId: userId };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map((task) => this.toResponseDto(task));
  }

  async findById(id: string, userId: string): Promise<any> {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Check access
    if (
      task.assignedToId !== userId &&
      user!.role !== UserRole.ADMIN &&
      user!.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponseDto(task);
  }

  async update(id: string, dto: UpdateTaskDto, userId: string): Promise<any> {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Check access
    if (
      task.assignedToId !== userId &&
      user!.role !== UserRole.ADMIN &&
      user!.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assignedToId: dto.assignedToId,
        completedAt:
          dto.status === 'done' && task.status !== 'done'
            ? new Date()
            : task.completedAt,
      },
    });

    return this.toResponseDto(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Only manager/admin can delete
    if (user!.role !== UserRole.ADMIN && user!.role !== UserRole.MANAGER) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.task.delete({
      where: { id },
    });
  }

  private toResponseDto(task: any) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assignedToId: task.assignedToId,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
