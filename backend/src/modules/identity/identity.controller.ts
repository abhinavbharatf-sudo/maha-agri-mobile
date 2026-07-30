// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 01: Identity & Authentication REST Controller (/api/v1/auth)
// ============================================================================

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { LoginDto, RegisterUserDto, RefreshTokenDto } from './dto/auth.dto';

@Controller('api/v1/auth')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.identityService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterUserDto) {
    return this.identityService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.identityService.refreshToken(dto);
  }
}
