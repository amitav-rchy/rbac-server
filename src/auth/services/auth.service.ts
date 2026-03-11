import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/database/prisma.service';
import { LoginDto, AuthResponseDto, RegisterDto } from '../dto/auth.dto';
import { PermissionService } from 'src/permissions/services/permission.service';
import { AuditService } from 'src/audit/services/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = parseInt(
    process.env.MAX_LOGIN_ATTEMPTS || '5',
  );
  private readonly LOGIN_ATTEMPT_RESET_MINUTES = parseInt(
    process.env.LOGIN_ATTEMPT_RESET_MINUTES || '15',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly permissionService: PermissionService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        assignedRole: true,
      },
    });

    if (!user) {
      await this.auditService.log({
        action: AuditAction.LOGIN,
        metadata: { email: dto.email, status: 'USER_NOT_FOUND' },
        ipAddress,
        status: 'failure',
        errorMessage: 'User not found',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is banned or inactive
    if (user.status === 'BANNED') {
      throw new UnauthorizedException('User account is banned');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('User account is suspended');
    }

    // Check login attempts
    const now = new Date();
    const resetTime = new Date(
      now.getTime() - this.LOGIN_ATTEMPT_RESET_MINUTES * 60 * 1000,
    );

    if (
      user.loginAttempts >= this.MAX_LOGIN_ATTEMPTS &&
      user.lastLoginAttemptAt &&
      user.lastLoginAttemptAt > resetTime
    ) {
      throw new UnauthorizedException(
        'Too many login attempts. Please try again later.',
      );
    }

    // Reset attempts if time has passed
    if (
      user.lastLoginAttemptAt &&
      user.lastLoginAttemptAt < resetTime &&
      user.loginAttempts > 0
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0 },
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      // Increment login attempts
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: user.loginAttempts + 1,
          lastLoginAttemptAt: now,
        },
      });

      await this.auditService.log({
        action: AuditAction.LOGIN,
        actorId: user.id,
        metadata: { email: dto.email, status: 'INVALID_PASSWORD' },
        ipAddress,
        status: 'failure',
        errorMessage: 'Invalid password',
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user permissions
    const permissions = await this.permissionService.getUserPermissions(user.id);

    // Create tokens
    const tokens = await this.createTokens(user, permissions);

    // Create session
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 10),
        accessToken: tokens.accessToken,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Reset login attempts
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lastLoginAt: now,
      },
    });

    // Log success
    await this.auditService.log({
      action: AuditAction.LOGIN,
      actorId: user.id,
      ipAddress,
      status: 'success',
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        role: user.role,
      },
    };
  }

  async register(dto: RegisterDto, ipAddress?: string): Promise<AuthResponseDto> {
    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Get default CUSTOMER role
    const customerRole = await this.prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });

    if (!customerRole) {
      throw new BadRequestException('Default role not found');
    }

    // Create user
    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'CUSTOMER',
        roleId: customerRole.id,
        status: 'ACTIVE',
      },
      include: {
        assignedRole: true,
      },
    });

    // Log registration
    await this.auditService.log({
      action: AuditAction.USER_CREATED,
      targetId: newUser.id,
      resourceType: 'User',
      metadata: { email: dto.email, username: dto.username },
      ipAddress,
      status: 'success',
    });

    // Get permissions for new user
    const permissions = await this.permissionService.getUserPermissions(
      newUser.id,
    );

    // Create tokens
    const { accessToken, refreshToken } = await this.createTokens(
      newUser,
      permissions,
    );

    // Create session
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.prisma.session.create({
      data: {
        userId: newUser.id,
        refreshToken,
        refreshTokenHash: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        firstName: newUser.firstName ?? undefined,
        lastName: newUser.lastName ?? undefined,
        role: newUser.role,
      },
    };
  }

  async refresh(
    refreshToken: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || !session.isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        assignedRole: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { isValid: false },
      });
      throw new UnauthorizedException('User not found or inactive');
    }

    // Get user permissions
    const permissions = await this.permissionService.getUserPermissions(user.id);

    // Create new tokens
    const newTokens = await this.createTokens(user, permissions);

    // Update session
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newTokens.refreshToken,
        refreshTokenHash: await bcrypt.hash(newTokens.refreshToken, 10),
        accessToken: newTokens.accessToken,
        updatedAt: new Date(),
      },
    });

    // Log token refresh
    await this.auditService.log({
      action: AuditAction.REFRESH_TOKEN,
      actorId: user.id,
      ipAddress,
      status: 'success',
    });

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName!,
        lastName: user.lastName!,
        role: user.role,
      },
    };
  }

  async logout(userId: string, ipAddress?: string): Promise<void> {
    // Invalidate all sessions for user
    await this.prisma.session.updateMany({
      where: { userId },
      data: { isValid: false, revokedAt: new Date() },
    });

    // Log logout
    await this.auditService.log({
      action: AuditAction.LOGOUT,
      actorId: userId,
      ipAddress,
      status: 'success',
    });
  }

  async validateUser(
    userId: string,
  ): Promise<{ userId: string; email: string; role: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private async createTokens(
    user: any,
    permissions: string[],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '900', 10),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800', 10),
    });

    return { accessToken, refreshToken };
  }
}
