import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  sub: number;
  tenantId: string;
  role: string;
  isMaster?: boolean;
}

/**
 * @CurrentUser() 데코레이터: 현재 JWT 페이로드를 컨트롤러 파라미터로 주입
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
