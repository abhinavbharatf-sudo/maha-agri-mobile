// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 01: Identity & Authentication DTO Specification
// ============================================================================

import { IsString, IsNotEmpty, IsMobilePhone, IsEmail, IsOptional, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  fullNameEn: string;

  @IsString()
  @IsOptional()
  fullNameMr?: string;

  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  roleKey: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class AuthResponseDto {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
      id: string;
      employeeCode?: string;
      mobileNumber: string;
      fullNameEn: string;
      roleKey: string;
    };
  };
  timestamp: string;
}
