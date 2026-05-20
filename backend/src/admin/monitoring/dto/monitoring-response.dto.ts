import { ApiProperty } from '@nestjs/swagger';

export class TimeSeriesPointDto {
  @ApiProperty({ example: '2026-05-20 10:00:00' })
  ts: string;

  @ApiProperty({ example: 1200.5 })
  value: number;
}

export class MonitoringOverviewResponseDto {
  @ApiProperty({ type: () => [TimeSeriesPointDto] })
  epsSeries: TimeSeriesPointDto[];

  @ApiProperty({ description: '수집 실패율(%)' })
  ingestErrorRate: number;

  @ApiProperty({ description: '파싱 실패율(%)' })
  parseErrorRate: number;

  @ApiProperty({ description: '평균 수집 지연(ms)' })
  avgIngestLatencyMs: number;

  @ApiProperty({ description: 'Go Engine 헬스 상태', example: true })
  engineHealthy: boolean;

  @ApiProperty({ description: 'Go Engine 헬스 체크 시각(UTC ISO)', nullable: true })
  engineCheckedAt: string | null;
}

export class MonitoringEventItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  tenantId: number | null;

  @ApiProperty({ description: '테넌트 식별 라벨(slug 등)' })
  tenantLabel: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  severity: string;

  @ApiProperty({ example: '2026-05-20 10:00:00' })
  occurredAt: string;
}

export class MonitoringPaginationDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;
}

export class MonitoringEventsResponseDto {
  @ApiProperty({ type: () => [MonitoringEventItemDto] })
  items: MonitoringEventItemDto[];

  @ApiProperty({ type: () => MonitoringPaginationDto })
  pagination: MonitoringPaginationDto;
}
