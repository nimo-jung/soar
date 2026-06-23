import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIpAddressToNetworkNodes1785600000002 implements MigrationInterface {
  name = 'AddIpAddressToNetworkNodes1785600000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'network_nodes',
      new TableColumn({
        name: 'ip_address',
        type: 'varchar',
        length: '45',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('network_nodes', 'ip_address');
  }
}