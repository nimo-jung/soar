import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('parsing_rules', { comment: '테넌트별 커스텀 로그 파싱 룰 (Go 엔진 Redis 캐싱)' })
export class ParsingRule {
  @PrimaryGeneratedColumn({ comment: '규칙 고유 ID' })
  id: number;

  @Column({ comment: '규칙 이름' })
  name: string;

  @Column({ name: 'rule_definition', type: 'json', comment: '파싱 규칙 정의 (JSON 구조)' })
  ruleDefinition: Record<string, unknown>;

  @Column({ name: 'log_source_type', nullable: true, comment: '적용 대상 로그 소스 유형' })
  logSourceType: string;

  @Column({ name: 'is_active', default: true, comment: '활성화 여부' })
  isActive: boolean;

  @Column({ type: 'int', default: 0, comment: '적용 우선순위 (낮을수록 먼저 적용)' })
  priority: number;

  @CreateDateColumn({ name: 'created_at', comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정 일시' })
  updatedAt: Date;
}
