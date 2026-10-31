import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { BusinessAuthGuard, CurrentUser } from './auth.guard.js';
import type { BusinessUser, AuthResponse } from './auth.types.js';

@ApiTags('Business Owner Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Sign in to the Business Owner portal with email and password',
  })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @ApiOperation({
    summary: 'Register a new Business Owner account',
  })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Get the profile of the currently signed-in business owner',
  })
  @ApiBearerAuth()
  @UseGuards(BusinessAuthGuard)
  @Get('me')
  async getProfile(
    @CurrentUser() user: BusinessUser,
  ): Promise<{ user: BusinessUser }> {
    return { user };
  }

  @ApiOperation({
    summary: 'Sign out and invalidate the business owner session',
  })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Headers('authorization') authHeader?: string): {
    success: boolean;
    message: string;
  } {
    this.authService.logout(authHeader);
    return { success: true, message: 'Signed out successfully' };
  }

  @ApiOperation({
    summary:
      'List available fictitious demo business owner accounts (for pitch & demo ease)',
  })
  @Get('demo-accounts')
  getDemoAccounts(): {
    accounts: Array<Omit<BusinessUser, 'createdAt'> & { hint: string }>;
  } {
    return { accounts: this.authService.listDemoUsers() };
  }
}
