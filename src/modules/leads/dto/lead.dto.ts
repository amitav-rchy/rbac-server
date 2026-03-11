import { IsString, IsOptional, IsNotEmpty, IsNumber, IsEnum } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsNumber()
  @IsOptional()
  value?: number;
}

export class UpdateLeadDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsNumber()
  @IsOptional()
  value?: number;

  @IsString()
  @IsOptional()
  assignedToId?: string;
}

export class LeadResponseDto {
  id: string;
  title: string;
  description?: string;
  email?: string;
  phone?: string;
  status: string;
  source?: string;
  value?: number;
  assignedToId?: string;
  createdAt: Date;
  updatedAt: Date;
}
