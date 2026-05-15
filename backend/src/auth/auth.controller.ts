import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('master/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '마스터 관리자 로그인' })
  masterLogin(@Body() dto: LoginDto) {
    return this.authService.loginAsMaster(dto);
  }

  @Post('tenant/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '테넌트 사용자 로그인 (brandingConfig 포함 응답)' })
  tenantLogin(@Body() dto: TenantLoginDto) {
    return this.authService.loginAsTenant(dto);
  }
}
