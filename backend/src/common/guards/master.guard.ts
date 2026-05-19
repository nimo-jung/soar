import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import type { Request } from 'express';
import { AuthSession } from '../../auth/entities/auth-session.entity';
import { AuthScope } from '../../auth/auth-policy.constants';

/**
 * MasterGuard: soar_admin 권한을 가진 계정만 /admin/* 접근 허용
 */
@Injectable()
export class MasterGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  private async assertActiveSession(payload: { sub: number; jti?: string }): Promise<void> {
    if (!payload.jti) {
      throw new UnauthorizedException('세션 정보가 없는 토큰입니다.');
    }

    const sessionRepo = this.dataSource.getRepository(AuthSession);
    const session = await sessionRepo
      .createQueryBuilder('session')
      .where('session.jti = :jti', { jti: payload.jti })
      .andWhere('session.scope = :scope', { scope: AuthScope.MASTER })
      .andWhere('session.account_id = :accountId', { accountId: String(payload.sub) })
      .andWhere('session.tenant_slug IS NULL')
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

    await this.assertActiveSession(payload);

    (req as any).user = {
      ...payload,
      email: payload.email ?? null,
    };

    return true;
  }
}
