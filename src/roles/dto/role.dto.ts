import { IsString, IsOptional, IsNotEmpty, IsArray, IsNumber } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AssignPermissionToRoleDto {
  @IsString()
  @IsNotEmpty()
  permissionId: string;
}

export class RemovePermissionFromRoleDto {
  @IsString()
  @IsNotEmpty()
  permissionId: string;
}

export class RoleResponseDto {
  id: string;
  name: string;
  description?: string;
  hierarchy: number;
  permissions?: PermissionResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class PermissionResponseDto {
  id: string;
  name: string;
  description?: string;
  category?: string;
}
