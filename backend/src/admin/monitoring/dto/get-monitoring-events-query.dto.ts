import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetMonitoringEventsQueryDto {
  @ApiPropertyOptional({ description: '심각도' })
  @IsString()
  @IsOptional()
  severity?: string;

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

  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
