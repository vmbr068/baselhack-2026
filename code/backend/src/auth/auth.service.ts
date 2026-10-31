import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import type { BusinessUser, AuthSession, AuthResponse } from './auth.types.js';
import type { LoginDto, RegisterDto } from './auth.dto.js';

interface StoredUser extends BusinessUser {
  passwordHash: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // In-memory fictitious accounts for demo (AGENTS.md rule 4: fictitious data only)
  private readonly users = new Map<string, StoredUser>();
  private readonly sessions = new Map<string, AuthSession>();

  constructor() {
    this.seedDemoAccounts();
  }

  private seedDemoAccounts(): void {
    const demoAccounts: Array<{
      email: string;
      password: string;
      fullName: string;
      company: string;
    }> = [
      {
        email: 'owner@hotelbasel.ch',
        password: 'basel2026',
        fullName: 'Beatrix Meier',
        company: 'Grand Hotel Basel',
      },
      {
        email: 'alex@atelier-studio.ch',
        password: 'demo1234',
        fullName: 'Alex Laurent',
        company: 'Atelier Studio Basel',
      },
    ];

    for (const acc of demoAccounts) {
      const id = `usr_${acc.email.split('@')[0]}`;
      this.users.set(acc.email.toLowerCase(), {
        id,
        email: acc.email.toLowerCase(),
        passwordHash: acc.password, // Fictitious plain storage for demo environment
        fullName: acc.fullName,
        company: acc.company,
        role: 'business_owner',
        createdAt: new Date().toISOString(),
      });
    }

    this.logger.log(
      `Seeded ${demoAccounts.length} fictitious business owner accounts for demo`,
    );
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = this.users.get(email);

    if (!user || user.passwordHash !== dto.password) {
      this.logger.warn(`Failed login attempt for email: ${email}`);
      throw new UnauthorizedException(
        'Invalid email or password. Please verify your credentials.',
      );
    }

    const token = `bus_tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const session: AuthSession = {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        company: user.company,
        role: user.role,
        createdAt: user.createdAt,
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    this.sessions.set(token, session);
    this.logger.log(
      `Business owner logged in: ${user.email} (${user.company})`,
    );

    return {
      success: true,
      token,
      user: session.user,
      message: `Welcome back, ${user.fullName}`,
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();

    if (this.users.has(email)) {
      throw new ConflictException(
        `An account with email '${email}' already exists. Please sign in instead.`,
      );
    }

    const id = `usr_${Date.now()}`;
    const newUser: StoredUser = {
      id,
      email,
      passwordHash: dto.password,
      fullName: dto.fullName.trim(),
      company: dto.company?.trim() || 'My Business',
      role: 'business_owner',
      createdAt: new Date().toISOString(),
    };

    this.users.set(email, newUser);

    const token = `bus_tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const session: AuthSession = {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        company: newUser.company,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    this.sessions.set(token, session);
    this.logger.log(
      `New business owner account created: ${newUser.email} (${newUser.company})`,
    );

    return {
      success: true,
      token,
      user: session.user,
      message: `Account created successfully for ${newUser.fullName}`,
    };
  }

  validateToken(token?: string): BusinessUser | null {
    if (!token) return null;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const session = this.sessions.get(cleanToken);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.sessions.delete(cleanToken);
      return null;
    }

    return session.user;
  }

  logout(token?: string): { success: boolean } {
    if (token) {
      const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
      this.sessions.delete(cleanToken);
    }
    return { success: true };
  }

  listDemoUsers(): Array<Omit<BusinessUser, 'createdAt'> & { hint: string }> {
    return Array.from(this.users.values()).map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      company: u.company,
      role: u.role,
      hint: `password: ${u.passwordHash}`,
    }));
  }
}
