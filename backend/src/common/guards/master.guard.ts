import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

/**
 * MasterGuard: soar_admin 권한을 가진 계정만 /admin/* 접근 허용
 */
@Injectable()
export class MasterGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.');
    }

    const token = authHeader.slice(7);
    try {
      const payload = this.jwtService.verify<{
        sub: number;
        email?: string;
        role: string;
        isMaster: boolean;
      }>(token);

      if (!payload.isMaster) {
        throw new ForbiddenException('마스터 관리자 권한이 필요합니다.');
      }

      (req as any).user = {
        ...payload,
        email: payload.email ?? null,
      };
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }
}
