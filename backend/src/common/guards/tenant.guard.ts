import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { tenantStorage } from '../context/tenant.context';
import { SessionStoreService } from '../session/session-store.service';

/**
 * TenantGuard: JWT에서 tenantId를 추출하여 TenantContext에 저장 후 요청 허용
 */
@Injectable()
export class TenantGuard implements CanActivate {
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
      tenantId: string;
      tenantSlug?: string;
      role: string;
      jti?: string;
    };

    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    if (!payload.jti) {
      throw new UnauthorizedException('세션 정보가 없는 토큰입니다.');
    }

    const sessionValid = await this.sessionStore.exists(payload.jti);
    if (!sessionValid) {
      throw new UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
    }

    (req as any).user = payload;

    return new Promise<boolean>((resolve) => {
      tenantStorage.run(
        { tenantId: payload.tenantId, userId: payload.sub, role: payload.role },
        () => resolve(true),
      );
    });
  }
}
