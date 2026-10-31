import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import type { BusinessUser } from './auth.types.js';

export interface AuthenticatedRequest extends Request {
  user?: BusinessUser;
}

@Injectable()
export class BusinessAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException(
        'Authentication required: missing Authorization header (Bearer <token>)',
      );
    }

    const user = this.authService.validateToken(authHeader);
    if (!user) {
      throw new UnauthorizedException(
        'Invalid or expired session token. Please sign in again.',
      );
    }

    req.user = user;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): BusinessUser | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
