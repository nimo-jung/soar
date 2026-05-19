import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import type { Request } from 'express';
import { tenantStorage } from '../context/tenant.context';
import { AuthSession } from '../../auth/entities/auth-session.entity';
import { AuthScope } from '../../auth/auth-policy.constants';

/**
 * TenantGuard: JWT에서 tenantId를 추출하여 TenantContext에 저장 후 요청 허용
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  private async assertActiveSession(payload: {
    sub: number;
    jti?: string;
    tenantSlug?: string;
  }): Promise<void> {
    if (!payload.jti) {
      throw new UnauthorizedException('세션 정보가 없는 토큰입니다.');
    }

    if (!payload.tenantSlug) {
      throw new UnauthorizedException('테넌트 세션 정보가 올바르지 않습니다.');
    }

    const sessionRepo = this.dataSource.getRepository(AuthSession);
    const session = await sessionRepo
      .createQueryBuilder('session')
      .where('session.jti = :jti', { jti: payload.jti })
      .andWhere('session.scope = :scope', { scope: AuthScope.TENANT })
      .andWhere('session.account_id = :accountId', { accountId: String(payload.sub) })
      .andWhere('session.tenant_slug = :tenantSlug', { tenantSlug: payload.tenantSlug })
      .andWhere('session.is_revoked = :isRevoked', { isRevoked: false })
      .getOne();

    if (!session) {
      throw new UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
    }

    if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
      await sessionRepo
        .createQueryBuilder()
        .update(AuthSession)
        .set({ isRevoked: true })
        .where('id = :id', { id: session.id })
        .execute();

      throw new UnauthorizedException('세션이 만료되었습니다. 다시 로그인해 주세요.');
    }
  }

  canActivate(context: ExecutionContext): Promise<boolean> {
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

    return this.assertActiveSession(payload).then(
      () => new Promise<boolean>((resolve) => {
        (req as any).user = payload;

        tenantStorage.run(
          { tenantId: payload.tenantId, userId: payload.sub, role: payload.role },
          () => resolve(true),
        );
      }),
    );
  }
}
