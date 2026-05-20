import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetMonitoringOverviewQueryDto {
  @ApiPropertyOptional({ description: '테넌트 ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @ApiPropertyOptional({ description: '조회 시작 시각 (YYYY-MM-DD HH:mm:ss)' })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: '조회 종료 시각 (YYYY-MM-DD HH:mm:ss)' })
  @IsString()
  @IsOptional()
  to?: string;
}
