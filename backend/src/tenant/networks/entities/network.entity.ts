import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('network_nodes')
export class NetworkEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  type: string;
}
