import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { VECTOR_INGESTION_MODES } from '../../../admin/vector-settings/vector-settings.constants';

class TenantVectorSourceConfigDto {
  @ApiPropertyOptional({ description: 'source transport (syslog 전용)', example: 'udp' })
  @IsOptional()
  @IsString()
  @IsIn(['udp', 'tcp'])
  transport?: 'udp' | 'tcp';

  @ApiPropertyOptional({ description: 'source address', example: '0.0.0.0' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'source port', example: 1514 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ description: 'http path', example: '/ingest' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: 'http auth 전략', example: 'none' })
  @IsOptional()
  @IsString()
  @IsIn(['none', 'basic', 'token'])
  authStrategy?: 'none' | 'basic' | 'token';

  @ApiPropertyOptional({ description: 'token 모드 인증값', example: 'tenant-source-token' })
  @IsOptional()
  @IsString()
  authToken?: string;

  @ApiPropertyOptional({ description: 'basic 모드 사용자명', example: 'collector' })
  @IsOptional()
  @IsString()
  basicUsername?: string;

  @ApiPropertyOptional({ description: 'basic 모드 비밀번호', example: 'collector-password' })
  @IsOptional()
  @IsString()
  basicPassword?: string;

  @ApiPropertyOptional({ description: 'cmd 실행 명령', example: 'echo hello' })
  @IsOptional()
  @IsString()
  command?: string;

  @ApiPropertyOptional({ description: 'cmd 실행 주기(초)', example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(86400)
  intervalSeconds?: number;

  @ApiPropertyOptional({ description: 'file include 패턴 목록', example: ['/var/log/*.log'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @ApiPropertyOptional({ description: 'file read_from', example: 'beginning' })
  @IsOptional()
  @IsString()
  @IsIn(['beginning', 'end'])
  readFrom?: 'beginning' | 'end';

  @ApiPropertyOptional({ description: 'kafka bootstrap servers', example: 'redpanda:9092' })
  @IsOptional()
  @IsString()
  bootstrapServers?: string;

  @ApiPropertyOptional({ description: 'kafka topic', example: 'logs.raw.input' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ description: 'kafka group id', example: 'vector-input-group' })
  @IsOptional()
  @IsString()
  groupId?: string;
}

export class TenantVectorSourceItemDto {
  @ApiProperty({ description: '소스 고유 ID(테넌트 내 유일)', example: 'fw-main-http' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]{2,64}$/)
  id: string;

  @ApiProperty({ description: '소스 표시명', example: 'Firewall Main HTTP' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '벤더 코드', example: 'paloalto' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]{2,32}$/)
  vendor: string;

  @ApiProperty({ description: '수집 방식', enum: VECTOR_INGESTION_MODES, example: 'http' })
  @IsString()
  @IsIn(VECTOR_INGESTION_MODES)
  ingestionMode: (typeof VECTOR_INGESTION_MODES)[number];

  @ApiProperty({ description: '활성 여부', example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: '수집 소스 상세 설정', type: TenantVectorSourceConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TenantVectorSourceConfigDto)
  sourceConfig?: TenantVectorSourceConfigDto;
}

export class UpdateTenantVectorSourcesDto {
  @ApiProperty({ description: '테넌트 Vector source 목록', type: [TenantVectorSourceItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TenantVectorSourceItemDto)
  items: TenantVectorSourceItemDto[];
}
