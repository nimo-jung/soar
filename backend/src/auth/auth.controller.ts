import { Controller, Post, Body, HttpCode, HttpStatus, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getRequestContext(req: Request) {
    return {
      ipAddress: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    };
  }

  @Post('master/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '마스터 관리자 로그인' })
  masterLogin(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.loginAsMaster(dto, this.getRequestContext(req));
  }

  @Post('tenant/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '테넌트 사용자 로그인 (brandingConfig 포함 응답)' })
  tenantLogin(@Body() dto: TenantLoginDto, @Req() req: Request) {
    return this.authService.loginAsTenant(dto, this.getRequestContext(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃 감사로그 기록' })
  logout(
    @Headers('authorization') authorization: string | undefined,
    @Req() req: Request,
  ) {
    return this.authService.logout(authorization, this.getRequestContext(req));
  }

  @Post('session/extend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '세션 만료 시간 연장' })
  extendSession(@Headers('authorization') authorization: string | undefined) {
    return this.authService.extendSession(authorization);
  }
}
