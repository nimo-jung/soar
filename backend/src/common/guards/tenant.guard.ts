import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { tenantStorage } from '../context/tenant.context';

/**
 * TenantGuard: JWT에서 tenantId를 추출하여 TenantContext에 저장 후 요청 허용
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.');
    }

    const token = authHeader.slice(7);
    try {
      const payload = this.jwtService.verify<{
        sub: number;
        tenantId: string;
        role: string;
      }>(token);

      (req as any).user = payload;

      return new Promise<boolean>((resolve) => {
        tenantStorage.run(
          { tenantId: payload.tenantId, userId: payload.sub, role: payload.role },
          () => resolve(true),
        );
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }
}
