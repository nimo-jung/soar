import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VECTOR_INGESTION_MODES } from '../vector-settings.constants';

class VectorParserProfileDto {
  @ApiPropertyOptional({ description: '벤더 코드(소문자 영문/숫자/하이픈 권장)', example: 'paloalto' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]{2,32}$/)
  vendor: string;

  @ApiPropertyOptional({ description: '벤더 분류 키워드/식별 문자열 배열', example: ['panos', 'palo alto'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  matchIndicators: string[];

  @ApiPropertyOptional({ description: '수집 방식', example: 'http', enum: VECTOR_INGESTION_MODES })
  @IsString()
  @IsIn(VECTOR_INGESTION_MODES)
  ingestionMode: (typeof VECTOR_INGESTION_MODES)[number];

  @ApiPropertyOptional({ description: 'device_code 추출 정규식', example: '(?P<device_code>[A-Za-z0-9._:-]{3,128})' })
  @IsString()
  @IsNotEmpty()
  deviceCodeRegex: string;

  @ApiPropertyOptional({ description: '추가 VRL 스크립트(선택)', example: '.parsed.extra = "ok"' })
  @IsOptional()
  @IsString()
  vrlScript?: string;

  @ApiPropertyOptional({ description: '활성 여부', example: true })
  @IsBoolean()
  enabled: boolean;
}

export class UpdateVectorSettingsDto {
  @ApiPropertyOptional({ description: 'Vector 벤더별 파서 프로파일 목록' })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => VectorParserProfileDto)
  parserProfiles?: VectorParserProfileDto[];

  @ApiPropertyOptional({ description: 'Vector -> Router 입력 토픽', example: 'logs.parsed.input' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  outputTopic?: string;

  @ApiPropertyOptional({ description: '파싱 실패/검역 토픽', example: 'logs.quarantine' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  quarantineTopic?: string;

  @ApiPropertyOptional({ description: 'unknown vendor 이벤트 허용 여부(허용 시 별도 분류)', example: false })
  @IsOptional()
  @IsBoolean()
  allowUnknownVendor?: boolean;
}
