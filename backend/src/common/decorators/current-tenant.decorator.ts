import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentTenant() 데코레이터: 현재 요청의 tenantId를 컨트롤러 파라미터로 주입
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.tenantId;
  },
);
