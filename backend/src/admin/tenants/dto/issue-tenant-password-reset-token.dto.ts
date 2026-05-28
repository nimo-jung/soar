import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, Max, Min } from 'class-validator';

export class IssueTenantPasswordResetTokenDto {
  @ApiProperty({ description: '재설정 대상 이메일', example: 'operator@acme.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: '토큰 만료 분(기본 30, 최소 5, 최대 1440)', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  expiresMinutes?: number;
}
