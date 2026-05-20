import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetInvoicePreviewQueryDto {
  @ApiProperty({ description: '청구 기준 월 (YYYY-MM)' })
  @IsString()
  billingMonth: string;

  @ApiPropertyOptional({ description: '테넌트 ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;
}
