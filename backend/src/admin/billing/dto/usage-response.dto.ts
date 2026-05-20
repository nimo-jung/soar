import { ApiProperty } from '@nestjs/swagger';

export class UsageSnapshotItemDto {
  @ApiProperty({ description: '테넌트 ID' })
  tenantId: number;

  @ApiProperty({ description: '테넌트명' })
  tenantName: string;

  @ApiProperty({ description: '집계 시각', example: '2026-05-20 10:00:00' })
  snapshotAt: string;

  @ApiProperty({ description: '평균 EPS' })
  epsAvg: number;

  @ApiProperty({ description: '사용 스토리지(GB)' })
  storageUsedGb: number;

  @ApiProperty({ description: '로그 건수' })
  logCount: number;
}

export class UsageSummaryDto {
  @ApiProperty({ description: '총 로그 건수' })
  totalLogCount: number;

  @ApiProperty({ description: '평균 EPS' })
  avgEps: number;

  @ApiProperty({ description: '평균 스토리지(GB)' })
  avgStorageGb: number;
}

export class PaginationDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;
}

export class UsageListResponseDto {
  @ApiProperty({ type: () => [UsageSnapshotItemDto] })
  items: UsageSnapshotItemDto[];

  @ApiProperty({ type: () => UsageSummaryDto })
  summary: UsageSummaryDto;

  @ApiProperty({ type: () => PaginationDto })
  pagination: PaginationDto;
}

export class InvoicePreviewItemDto {
  @ApiProperty()
  tenantId: number;

  @ApiProperty()
  tenantName: string;

  @ApiProperty()
  billingMonth: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;
}

export class InvoicePreviewResponseDto {
  @ApiProperty({ type: () => [InvoicePreviewItemDto] })
  items: InvoicePreviewItemDto[];
}
