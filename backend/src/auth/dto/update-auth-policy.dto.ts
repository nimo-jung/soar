import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateAuthPolicyDto {
  @ApiProperty({ example: 3, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  maxLoginFailures: number;

  @ApiProperty({ example: 5, minimum: 3, maximum: 30 })
  @IsInt()
  @Min(3)
  @Max(30)
  lockMinutes: number;

  @ApiProperty({ example: 1, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  maxConcurrentSessions: number;

  @ApiProperty({ example: 5, minimum: 0, maximum: 30, description: '0이면 자동 로그아웃 없음' })
  @IsInt()
  @Min(0)
  @Max(30)
  autoLogoutTimeoutMinutes: number;

  @ApiPropertyOptional({ description: '멀티테넌트 기능 활성화 여부', default: false })
  @IsBoolean()
  @IsOptional()
  isMultiTenantEnabled?: boolean;
}
