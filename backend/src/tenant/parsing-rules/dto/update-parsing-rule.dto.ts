import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateParsingRuleDto {
  @ApiPropertyOptional({ description: '파싱 룰 이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '파싱 룰 정의 JSON' })
  @IsOptional()
  @IsObject()
  ruleDefinition?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '적용 대상 로그 소스 유형' })
  @IsOptional()
  @IsString()
  logSourceType?: string;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '우선순위(낮을수록 먼저 적용)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
