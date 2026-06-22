import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNetworkTables1785600000001 implements MigrationInterface {
  name = 'CreateNetworkTables1785600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the nodes table (id will be BIGINT UNSIGNED behind the scenes)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`network_nodes\` (
          \`id\` SERIAL PRIMARY KEY,
          \`name\` VARCHAR(255) NOT NULL,
          \`status\` VARCHAR(50),
          \`type\` VARCHAR(50)
      );
    `);

    // 2. Create the edges table with matching BIGINT UNSIGNED types
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`network_edges\` (
          \`id\` SERIAL PRIMARY KEY,
          \`source_id\` BIGINT UNSIGNED,
          \`target_id\` BIGINT UNSIGNED,
          \`label\` VARCHAR(255),
          \`type\` VARCHAR(50),
          CONSTRAINT \`fk_source_node\` FOREIGN KEY (\`source_id\`) REFERENCES \`network_nodes\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_target_node\` FOREIGN KEY (\`target_id\`) REFERENCES \`network_nodes\`(\`id\`) ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `network_edges`;');
    await queryRunner.query('DROP TABLE IF EXISTS `network_nodes`;');
  }
}