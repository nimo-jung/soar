import { SetMetadata } from '@nestjs/common';
import { TenantRole } from '../guards/roles.guard';

export const ROLES_KEY = 'roles';

/**
 * @Roles() 데코레이터: 컨트롤러/핸들러에 필요 역할을 선언
 * 예: @Roles(TenantRole.OPERATOR, TenantRole.ANALYST)
 */
export const Roles = (...roles: TenantRole[]) => SetMetadata(ROLES_KEY, roles);
