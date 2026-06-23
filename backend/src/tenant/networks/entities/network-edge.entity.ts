// network-edge.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { NetworkEntity } from './network.entity'; // 기존 파일 명칭에 맞게 경로를 조정해주세요.

@Entity('network_edges')
export class NetworkEdgeEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ name: 'tenant_id', length: 100 })
  tenant_id!: string;

  @Column({ type: 'bigint', unsigned: true })
  source_id!: number;

  @Column({ type: 'bigint', unsigned: true })
  target_id!: number;

  @Column({ length: 255, nullable: true })
  label!: string;

  @Column({ length: 50, default: 'smoothstep' })
  type!: string;

  // 데이터 조회 시 노드 정보를 함께 Join해서 핸들링하고 싶을 때를 위한 관계 설정 (선택 사항)
  @ManyToOne(() => NetworkEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_id' })
  sourceNode!: NetworkEntity;

  @ManyToOne(() => NetworkEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_id' })
  targetNode!: NetworkEntity;
}