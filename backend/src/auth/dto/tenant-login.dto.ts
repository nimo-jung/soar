import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantLoginDto {
  @ApiProperty({ example: 'operator@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securepassword' })
  @IsString()
  password: string;

  @ApiProperty({ description: '테넌트 슬러그 (단일 테넌트 모드에서는 생략 가능)', example: 'acme-corp', required: false })
  @IsOptional()
  @IsString()
  tenantSlug?: string;

  @ApiPropertyOptional({ description: '동시 세션 초과 시 기존 세션을 강제 종료하고 로그인할지 여부' })
  @IsOptional()
  @IsBoolean()
  forceLogoutExistingSessions?: boolean;
}
