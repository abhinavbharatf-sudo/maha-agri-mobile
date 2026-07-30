// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 01: Identity & Authentication Service Implementation
// ============================================================================

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { LoginDto, RegisterUserDto, RefreshTokenDto } from './dto/auth.dto';

export interface UserSessionData {
  userId: string;
  mobileNumber: string;
  fullNameEn: string;
  roleKey: string;
}

@Injectable()
export class IdentityService {
  // In-Memory Dev User Registry (Prisma ORM integration target)
  private users = new Map<string, any>([
    [
      '9876543210',
      {
        id: '00000000-0000-0000-0000-000000000001',
        employeeCode: 'MA-SUP-0001',
        mobileNumber: '9876543210',
        email: 'admin@abhinavbharat.org',
        fullNameEn: 'Super Admin Officer',
        fullNameMr: 'सुपर ॲडमिन अधिकारी',
        passwordHash: '$2a$10$w6Bv5l8x4y9z7A1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
        roleKey: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    ],
    [
      '9876543211',
      {
        id: 'usr-hr-0001',
        employeeCode: 'MA-HR-0002',
        mobileNumber: '9876543211',
        email: 'hr@abhinavbharat.org',
        fullNameEn: 'HR Manager Officer',
        fullNameMr: 'एचआर व्यवस्थापक',
        passwordHash: '$2a$10$w6Bv5l8x4y9z7A1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
        roleKey: 'STATE_ADMIN',
        status: 'ACTIVE',
      },
    ],
  ]);

  async login(loginDto: LoginDto) {
    const user = this.users.get(loginDto.mobileNumber);
    if (!user) {
      throw new UnauthorizedException('Invalid mobile number or password');
    }

    const accessToken = `jwt-access-token-${user.id}-${Date.now()}`;
    const refreshToken = `jwt-refresh-token-${user.id}-${Date.now()}`;

    return {
      success: true,
      message: 'Authentication successful.',
      data: {
        accessToken,
        refreshToken,
        expiresIn: 86400,
        user: {
          id: user.id,
          employeeCode: user.employeeCode,
          mobileNumber: user.mobileNumber,
          fullNameEn: user.fullNameEn,
          roleKey: user.roleKey,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  async register(registerDto: RegisterUserDto) {
    if (this.users.has(registerDto.mobileNumber)) {
      throw new BadRequestException('Mobile number already registered');
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      employeeCode: `MA-REG-${Math.floor(1000 + Math.random() * 9000)}`,
      mobileNumber: registerDto.mobileNumber,
      email: registerDto.email || null,
      fullNameEn: registerDto.fullNameEn,
      fullNameMr: registerDto.fullNameMr || null,
      passwordHash: 'hashed_password',
      roleKey: registerDto.roleKey || 'FARMER',
      status: 'ACTIVE',
    };

    this.users.set(newUser.mobileNumber, newUser);

    return {
      success: true,
      message: 'User registered successfully.',
      data: newUser,
      timestamp: new Date().toISOString(),
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    return {
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        accessToken: `jwt-access-token-refreshed-${Date.now()}`,
        refreshToken: dto.refreshToken,
        expiresIn: 86400,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
