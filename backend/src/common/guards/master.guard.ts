import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { SessionStoreService } from '../session/session-store.service';

/**
 * MasterGuard: tms_admin 권한을 가진 계정만 /admin/* 접근 허용
 */
@Injectable()
export class MasterGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionStore: SessionStoreService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.');
    }

    const token = authHeader.slice(7);
    let payload: {
      sub: number;
      email?: string;
      role: string;
      isMaster: boolean;
      jti?: string;
    };

    try {
      payload = this.jwtService.verify(token);
    } catch (err) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    if (!payload.isMaster) {
      throw new ForbiddenException('마스터 관리자 권한이 필요합니다.');
    }

    if (!payload.jti) {
      throw new UnauthorizedException('세션 정보가 없는 토큰입니다.');
    }

    const sessionValid = await this.sessionStore.exists(payload.jti);
    if (!sessionValid) {
      throw new UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
    }

    (req as any).user = {
      ...payload,
      email: payload.email ?? null,
    };

    return true;
  }
}
