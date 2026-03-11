import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateReportDto } from '../dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReportDto, userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const report = await this.prisma.report.create({
      data: {
        title: dto.title,
        description: dto.description,
        reportType: dto.reportType,
        format: dto.format || 'pdf',
        data: dto.data ? JSON.stringify(dto.data) : null,
        generatedBy: userId,
      },
    });

    return this.toResponseDto(report);
  }

  async findAll(skip = 0, take = 10): Promise<any> {
    const reports = await this.prisma.report.findMany({
      skip,
      take,
      orderBy: { generatedAt: 'desc' },
      include: {
        generatedByUser: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return reports.map((report) => this.toResponseDtoWithUser(report));
  }

  async findById(id: string): Promise<any> {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        generatedByUser: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return this.toResponseDtoWithUser(report);
  }

  async deleteReport(id: string): Promise<void> {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    await this.prisma.report.delete({
      where: { id },
    });
  }

  private toResponseDto(report: any) {
    return {
      id: report.id,
      title: report.title,
      description: report.description,
      reportType: report.reportType,
      generatedBy: report.generatedBy,
      data: report.data ? JSON.parse(report.data) : null,
      format: report.format,
      generatedAt: report.generatedAt,
    };
  }

  private toResponseDtoWithUser(report: any) {
    return {
      ...this.toResponseDto(report),
      generatedByUser: report.generatedByUser,
    };
  }
}
