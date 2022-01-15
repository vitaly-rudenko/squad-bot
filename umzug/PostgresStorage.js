export class PostgresStorage {
  constructor(client, tableName) {
    this.client = client
    this.tableName = tableName
  }

  async logMigration(migrationName) {
    await this.init()

    await this.client.query(`
      INSERT INTO ${this.tableName}(name)
      VALUES ('${migrationName}')
      ON CONFLICT DO NOTHING;
    `)
  }

  async unlogMigration(migrationName) {
    await this.init()

    await this.client.query(`
      DELETE FROM ${this.tableName}
      WHERE name = '${migrationName}';
    `)
  }

  async executed() {
    await this.init()

    const { rows } = await this.client.query(`
      SELECT name FROM ${this.tableName};
    `)

    return rows.map(row => row.name)
  }

  async init() {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        name varchar(255) PRIMARY KEY
      );
    `)
  }
}
