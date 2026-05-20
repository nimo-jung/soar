import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class BillingPricingPolicyItemDto {
  @ApiProperty({ description: '등급 코드', example: 'LITE' })
  tierCode: string;

  @ApiProperty({ description: '기본 요금' })
  baseFee: number;

  @ApiProperty({ description: '기본 포함 EPS' })
  includedEps: number;

  @ApiProperty({ description: 'EPS 초과 100당 단가' })
  epsOveragePer100: number;

  @ApiProperty({ description: '스토리지 초과 GB당 단가' })
  storageOveragePerGb: number;

  @ApiProperty({ description: '로그 100만 건당 단가' })
  logPerMillion: number;

  @ApiProperty({ description: '통화 코드', example: 'USD' })
  currency: string;
}

export class BillingPricingPolicyListResponseDto {
  @ApiProperty({ type: () => [BillingPricingPolicyItemDto] })
  items: BillingPricingPolicyItemDto[];
}

export class UpsertBillingPricingPolicyItemDto {
  @ApiProperty({ description: '등급 코드', enum: ['LITE', 'PREMIUM', 'ENTERPRISE'] })
  @IsString()
  @IsIn(['LITE', 'PREMIUM', 'ENTERPRISE'])
  tierCode: string;

  @ApiProperty({ description: '기본 요금', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseFee: number;

  @ApiProperty({ description: '기본 포함 EPS', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  includedEps: number;

  @ApiProperty({ description: 'EPS 초과 100당 단가', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  epsOveragePer100: number;

  @ApiProperty({ description: '스토리지 초과 GB당 단가', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  storageOveragePerGb: number;

  @ApiProperty({ description: '로그 100만 건당 단가', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  logPerMillion: number;

  @ApiProperty({ description: '통화 코드', required: false, example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpsertBillingPricingPoliciesDto {
  @ApiProperty({ type: () => [UpsertBillingPricingPolicyItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertBillingPricingPolicyItemDto)
  items: UpsertBillingPricingPolicyItemDto[];
}
