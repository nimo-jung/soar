import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateParsingRuleDto {
  @ApiProperty({ description: '파싱 룰 이름' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '파싱 룰 정의 JSON' })
  @IsObject()
  ruleDefinition: Record<string, unknown>;

  @ApiPropertyOptional({ description: '적용 대상 로그 소스 유형' })
  @IsOptional()
  @IsString()
  logSourceType?: string;

  @ApiPropertyOptional({ description: '우선순위(낮을수록 먼저 적용)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
