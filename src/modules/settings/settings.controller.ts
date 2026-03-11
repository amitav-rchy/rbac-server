import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { SettingsService } from './services/settings.service';
import { UpdateSettingDto } from './dto/setting.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@Controller('settings')
@ApiTags('settings')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Get(':key')
  async getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  @Patch(':key')
  @Permission('manage_settings')
  @UseGuards(PermissionGuard)
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.settingsService.updateSetting(key, dto, userId);
  }

  @Delete(':key')
  @Permission('manage_settings')
  @UseGuards(PermissionGuard)
  async deleteSetting(@Param('key') key: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    await this.settingsService.deleteSetting(key, userId);
    return { message: 'Setting deleted' };
  }
}
