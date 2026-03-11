import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ReportsService } from './services/reports.service';
import { CreateReportDto } from './dto/report.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@Controller('reports')
@ApiTags('reports')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Permission('view_reports')
  @UseGuards(PermissionGuard)
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.reportsService.findAll(parseInt(skip || '0'), parseInt(take || '10'));
  }

  @Get(':id')
  @Permission('view_reports')
  @UseGuards(PermissionGuard)
  async findById(@Param('id') id: string) {
    return this.reportsService.findById(id);
  }

  @Post()
  @Permission('manage_reports')
  @UseGuards(PermissionGuard)
  async create(@Body() dto: CreateReportDto, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.reportsService.create(dto, userId);
  }

  @Delete(':id')
  @Permission('manage_reports')
  @UseGuards(PermissionGuard)
  async delete(@Param('id') id: string) {
    await this.reportsService.deleteReport(id);
    return { message: 'Report deleted' };
  }
}
