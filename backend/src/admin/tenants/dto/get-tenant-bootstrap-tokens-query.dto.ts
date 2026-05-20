import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetTenantBootstrapTokensQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호(기본 1)', minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기(기본 10, 최대 100)', minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: '발급 시작 시각(ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: '발급 종료 시각(ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
