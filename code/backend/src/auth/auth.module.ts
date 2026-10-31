import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { BusinessAuthGuard } from './auth.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, BusinessAuthGuard],
  exports: [AuthService, BusinessAuthGuard],
})
export class AuthModule {}
