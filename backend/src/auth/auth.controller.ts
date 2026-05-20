import { Controller, Post, Get, Query, Body, HttpCode, HttpStatus, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { BootstrapMasterDto } from './dto/bootstrap-master.dto';

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

  @Get('license/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '라이선스 만료 경고 조회 (공개 API)' })
  getLicenseStatus() {
    return this.authService.getPublicLicenseStatus();
  }

  @Get('tenant/expiry-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '테넌트 사용기한 만료 경고 조회 (공개 API)' })
  getTenantExpiryStatus(@Query('tenantSlug') tenantSlug: string | undefined) {
    return this.authService.getPublicTenantExpiryStatus(tenantSlug ?? '');
  }

  @Get('master/lock-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '마스터 로그인 계정 잠금 상태 조회 (공개 API)' })
  getMasterLockStatus(@Query('email') email: string | undefined) {
    return this.authService.getMasterLockStatus(email ?? '');
  }

  @Get('tenant/lock-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '테넌트 로그인 계정 잠금 상태 조회 (공개 API)' })
  getTenantLockStatus(
    @Query('tenantSlug') tenantSlug: string | undefined,
    @Query('email') email: string | undefined,
  ) {
    return this.authService.getTenantLockStatus(tenantSlug ?? '', email ?? '');
  }

  @Post('master/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '마스터 관리자 로그인' })
  masterLogin(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.loginAsMaster(dto, this.getRequestContext(req));
  }

  @Post('master/bootstrap')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '최초 마스터 관리자 계정 등록 (관리자 계정이 없을 때만 가능)' })
  masterBootstrap(@Body() dto: BootstrapMasterDto, @Req() req: Request) {
    return this.authService.bootstrapMaster(dto, this.getRequestContext(req));
  }

  @Post('master/bootstrap/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '최초 마스터 관리자 등록 필요 여부 조회' })
  masterBootstrapStatus() {
    return this.authService.getMasterBootstrapStatus();
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

  @Post('logout/beacon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '브라우저 종료 시 로그아웃(beacon)' })
  beaconLogout(
    @Body('token') token: string | undefined,
    @Req() req: Request,
  ) {
    return this.authService.logoutByToken(token, this.getRequestContext(req));
  }

  @Post('session/extend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '세션 만료 시간 연장' })
  extendSession(@Headers('authorization') authorization: string | undefined) {
    return this.authService.extendSession(authorization);
  }
}
