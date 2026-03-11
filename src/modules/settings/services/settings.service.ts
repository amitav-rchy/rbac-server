import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { UpdateSettingDto } from '../dto/setting.dto';
import { UserRole } from 'src/common/constants';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllSettings(): Promise<any> {
    const settings = await this.prisma.settings.findMany();
    return settings.map((s) => this.toResponseDto(s));
  }

  async getSetting(key: string): Promise<any> {
    const setting = await this.prisma.settings.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting '${key}' not found`);
    }

    return this.toResponseDto(setting);
  }

  async updateSetting(
    key: string,
    dto: UpdateSettingDto,
    userId: string,
  ): Promise<any> {
    // Only admin can update settings
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update settings');
    }

    const existing = await this.prisma.settings.findUnique({
      where: { key },
    });

    if (existing) {
      const updated = await this.prisma.settings.update({
        where: { key },
        data: {
          value: dto.value,
          description: dto.description,
          type: dto.type,
        },
      });
      return this.toResponseDto(updated);
    } else {
      const created = await this.prisma.settings.create({
        data: {
          key,
          value: dto.value,
          description: dto.description,
          type: dto.type || 'string',
        },
      });
      return this.toResponseDto(created);
    }
  }

  async deleteSetting(key: string, userId: string): Promise<void> {
    // Only admin can delete settings
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete settings');
    }

    const setting = await this.prisma.settings.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting '${key}' not found`);
    }

    await this.prisma.settings.delete({
      where: { key },
    });
  }

  private toResponseDto(setting: any) {
    return {
      id: setting.id,
      key: setting.key,
      value: setting.value,
      description: setting.description,
      type: setting.type,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }
}
