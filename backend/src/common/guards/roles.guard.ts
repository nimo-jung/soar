import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

export enum TenantRole {
  OPERATOR = 'operator',
  ANALYST = 'analyst',
  AUDITOR = 'auditor',
}

/**
 * RolesGuard: 테넌트 내 역할(role)과 tenantId를 함께 검증
 * TenantGuard 이후에 실행되어야 한다.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<TenantRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user as { sub: number; tenantId: string; role: string };

    if (!user?.tenantId) {
      throw new ForbiddenException('테넌트 컨텍스트가 없습니다.');
    }

    if (!requiredRoles.includes(user.role as TenantRole)) {
      throw new ForbiddenException(
        `해당 기능은 [${requiredRoles.join(', ')}] 역할이 필요합니다.`,
      );
    }

    return true;
  }
}
