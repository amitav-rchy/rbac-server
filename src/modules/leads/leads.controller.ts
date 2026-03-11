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
import { LeadsService } from './services/leads.service';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@Controller('leads')
@ApiTags('leads')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @Permission('view_leads')
  @UseGuards(PermissionGuard)
  async findAll(
    @Req() req: Request,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const userId = (req.user as any).userId;
    return this.leadsService.findAll(userId, parseInt(skip || '0'), parseInt(take || '10'));
  }

  @Get(':id')
  @Permission('view_leads')
  @UseGuards(PermissionGuard)
  async findById(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.leadsService.findById(id, userId);
  }

  @Post()
  @Permission('create_leads')
  @UseGuards(PermissionGuard)
  async create(@Body() dto: CreateLeadDto, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.leadsService.create(dto, userId);
  }

  @Patch(':id')
  @Permission('manage_leads')
  @UseGuards(PermissionGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.leadsService.update(id, dto, userId);
  }

  @Delete(':id')
  @Permission('manage_leads')
  @UseGuards(PermissionGuard)
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    await this.leadsService.delete(id, userId);
    return { message: 'Lead deleted' };
  }
}
