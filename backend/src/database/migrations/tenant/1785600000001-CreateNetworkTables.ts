// CreateNetworkTables1785600000001.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNetworkTables1785600000001 implements MigrationInterface {
  name = 'CreateNetworkTables1785600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the nodes table with coordinates and tenant isolation
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`network_nodes\` (
          \`id\` SERIAL PRIMARY KEY,
          \`tenant_id\` VARCHAR(100) NOT NULL,
          \`name\` VARCHAR(255) NOT NULL,
          \`status\` VARCHAR(50) DEFAULT 'normal',
          \`type\` VARCHAR(50) DEFAULT 'subnet',
          \`x_pos\` DOUBLE PRECISION NOT NULL DEFAULT 0,
          \`y_pos\` DOUBLE PRECISION NOT NULL DEFAULT 0,
          INDEX \`idx_nodes_tenant\` (\`tenant_id\`)
      );
    `);

    // 2. Create the edges table with matching tenant isolation
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`network_edges\` (
          \`id\` SERIAL PRIMARY KEY,
          \`tenant_id\` VARCHAR(100) NOT NULL,
          \`source_id\` BIGINT UNSIGNED NOT NULL,
          \`target_id\` BIGINT UNSIGNED NOT NULL,
          \`label\` VARCHAR(255) NULL,
          \`type\` VARCHAR(50) DEFAULT 'smoothstep',
          CONSTRAINT \`fk_source_node\` FOREIGN KEY (\`source_id\`) REFERENCES \`network_nodes\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_target_node\` FOREIGN KEY (\`target_id\`) REFERENCES \`network_nodes\`(\`id\`) ON DELETE CASCADE,
          INDEX \`idx_edges_tenant\` (\`tenant_id\`)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `network_edges`;');
    await queryRunner.query('DROP TABLE IF EXISTS `network_nodes`;');
  }
}