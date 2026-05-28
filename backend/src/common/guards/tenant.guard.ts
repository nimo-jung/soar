import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { tenantStorage } from '../context/tenant.context';
import { SessionStoreService } from '../session/session-store.service';
import { Tenant } from '../../admin/tenants/entities/tenant.entity';

/**
 * TenantGuard: JWT에서 tenantId를 추출하여 TenantContext에 저장 후 요청 허용
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionStore: SessionStoreService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
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
      tenantExpiresAt?: string | null;
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

    if (payload.tenantExpiresAt) {
      const expiresAt = new Date(payload.tenantExpiresAt);
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException('테넌트 사용기한이 만료되었습니다. 관리자에게 문의하세요.');
      }
    }

    if (payload.tenantSlug) {
      const tenant = await this.tenantRepo.findOne({
        where: { slug: payload.tenantSlug, status: 'ACTIVE' as any },
      });

      if (!tenant) {
        throw new UnauthorizedException('유효한 테넌트를 찾을 수 없습니다.');
      }

      if (tenant.expiresAt && tenant.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException('테넌트 사용기한이 만료되었습니다. 관리자에게 문의하세요.');
      }
    }

    (req as any).user = payload;

    // Keep tenant context available for the full downstream request lifecycle.
    tenantStorage.enterWith({ tenantId: payload.tenantId, userId: payload.sub, role: payload.role });
    return true;
  }
}
