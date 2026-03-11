import { IsString, IsOptional, IsNotEmpty, IsArray } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdatePermissionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class GrantPermissionDto {
  @IsString()
  @IsNotEmpty()
  permissionId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class RevokePermissionDto {
  @IsString()
  @IsNotEmpty()
  permissionId: string;
}

export class PermissionResponseDto {
  id: string;
  name: string;
  description?: string;
  category?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}
