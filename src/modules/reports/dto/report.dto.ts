import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  reportType: string;

  @IsString()
  @IsOptional()
  format?: string;

  @IsOptional()
  data?: any;
}

export class ReportResponseDto {
  id: string;
  title: string;
  description?: string;
  reportType: string;
  generatedBy: string;
  data?: any;
  format: string;
  generatedAt: Date;
}
