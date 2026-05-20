import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuotaDto {
  @ApiPropertyOptional({ description: '초당 허용 이벤트 수 한도 (0 = 무제한)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  epsLimit?: number;

  @ApiPropertyOptional({ description: '스토리지 허용 한도(GB) (0 = 무제한)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  storageQuotaGb?: number;

  @ApiPropertyOptional({ description: 'ClickHouse TTL 기준 로그 보관 주기(일) (0 = 무제한)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  retentionDays?: number;
}
