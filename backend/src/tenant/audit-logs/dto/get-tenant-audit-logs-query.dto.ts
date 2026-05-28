import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AuditActorType } from '../../../common/audit/entities/audit-log.entity';

export class GetTenantAuditLogsQueryDto {
  @ApiPropertyOptional({ description: '조회 개수(기본 50, 최대 200)', minimum: 1, maximum: 200 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ description: '행위 코드 부분 검색' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ enum: AuditActorType, description: '행위자 유형 필터' })
  @IsOptional()
  @IsEnum(AuditActorType)
  actorType?: AuditActorType;
}
