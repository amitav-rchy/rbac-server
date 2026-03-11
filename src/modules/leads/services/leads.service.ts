import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateLeadDto, UpdateLeadDto } from '../dto/lead.dto';
import { UserRole } from 'src/common/constants';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeadDto, userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const lead = await this.prisma.lead.create({
      data: {
        title: dto.title,
        description: dto.description,
        email: dto.email,
        phone: dto.phone,
        source: dto.source,
        value: dto.value,
        assignedToId: userId,
      },
    });

    return this.toResponseDto(lead);
  }

  async findAll(userId: string, skip = 0, take = 10): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let where: any = {};

    // Non-managers see only their assigned leads
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
      where = { assignedToId: userId };
    }

    const leads = await this.prisma.lead.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return leads.map((lead) => this.toResponseDto(lead));
  }

  async findById(id: string, userId: string): Promise<any> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Check access
    if (
      lead.assignedToId !== userId &&
      user!.role !== UserRole.ADMIN &&
      user!.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponseDto(lead);
  }

  async update(id: string, dto: UpdateLeadDto, userId: string): Promise<any> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Check access
    if (
      lead.assignedToId !== userId &&
      user!.role !== UserRole.ADMIN &&
      user!.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        email: dto.email,
        phone: dto.phone,
        status: dto.status,
        source: dto.source,
        value: dto.value,
        assignedToId: dto.assignedToId,
      },
    });

    return this.toResponseDto(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Only manager/admin can delete
    if (user!.role !== UserRole.ADMIN && user!.role !== UserRole.MANAGER) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.lead.delete({
      where: { id },
    });
  }

  private toResponseDto(lead: any) {
    return {
      id: lead.id,
      title: lead.title,
      description: lead.description,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      source: lead.source,
      value: lead.value,
      assignedToId: lead.assignedToId,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }
}
