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
import { UsersService } from './services/users.service';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/user.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@Controller('users')
@ApiTags('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permission('create_users')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Create a new user account. Requires create_users permission.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async create(@Body() dto: CreateUserDto, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.usersService.create(dto, userId);
  }

  @Get()
  @Permission('view_users')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve paginated list of users. Managers see their team, Admins see all users.',
  })
  @ApiQuery({ name: 'skip', type: String, required: false, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', type: String, required: false, description: 'Number of records to take' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll(
    @Req() req: Request,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const userId = (req.user as any).userId;
    return this.usersService.findAll(userId, parseInt(skip || '0'), parseInt(take || '10'));
  }

  @Get(':id')
  @Permission('view_users')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID',
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findById(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.usersService.findById(id, userId);
  }

  @Patch(':id')
  @Permission('update_users')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user information',
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.usersService.update(id, dto, userId);
  }

  @Delete(':id')
  @Permission('delete_users')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Delete a user permanently',
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    await this.usersService.delete(id, userId);
    return { message: 'User deleted successfully' };
  }

  @Patch(':id/suspend')
  @Permission('suspend_users')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Suspend user',
    description: 'Temporarily suspend a user account. User cannot login.',
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User suspended successfully',
  })
  async suspend(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.usersService.suspend(id, userId);
  }

  @Patch(':id/ban')
  @Permission('ban_users')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Ban user',
    description: 'Permanently ban a user account. User cannot login.',
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User banned successfully',
  })
  async ban(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.usersService.ban(id, userId);
  }

  @Patch(':id/activate')
  @Permission('manage_users')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Activate user',
    description: 'Activate a suspended or banned user account',
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User activated successfully',
  })
  async activate(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.usersService.activate(id, userId);
  }

  @Patch(':id/reset-password')
  @Permission('manage_users')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Reset user password',
    description: 'Reset a user password to a new value',
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    await this.usersService.resetPassword(id, dto, userId);
    return { message: 'Password reset successfully' };
  }
}
