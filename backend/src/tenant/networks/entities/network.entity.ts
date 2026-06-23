// network.entity.ts (기존 파일 수정본)
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('network_nodes')
export class NetworkEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ name: 'tenant_id', length: 100 })
  tenant_id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ nullable: true, default: 'normal' })
  status!: string;

  @Column({ nullable: true, default: 'subnet' })
  type!: string;

  // ReactFlow 노드의 X, Y 좌표값을 저장하기 위한 데코레이터 추가
  @Column({ type: 'double precision', default: 0 })
  x_pos!: number;

  @Column({ type: 'double precision', default: 0 })
  y_pos!: number;

  @Column({ length: 45, nullable: true })
  ip_address?: string;
}
