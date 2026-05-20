import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, Max, Min } from 'class-validator';

export class IssueTenantBootstrapTokenDto {
  @ApiPropertyOptional({ description: '초대 대상 이메일(생략 가능)', example: 'operator@acme.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '토큰 만료 분(기본 60, 최소 10, 최대 1440)', example: 60 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1440)
  expiresMinutes?: number;
}
