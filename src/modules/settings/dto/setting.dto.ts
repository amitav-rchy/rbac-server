import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateSettingDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  type?: string;
}

export class SettingResponseDto {
  id: string;
  key: string;
  value?: string;
  description?: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}
