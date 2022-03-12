import fs from 'fs'
import path from 'path'
import { umzug } from './umzug.js'

class MigrationsCli {
  constructor() {
    umzug.on('migrating', event => console.log(`== ${event.name}: migrating ==`))
    umzug.on('migrated', event => console.log(`== ${event.name}: migrated ==\n`))
    umzug.on('reverting', event => console.log(`== ${event.name}: reverting ==`))
    umzug.on('reverted', event => console.log(`== ${event.name}: reverted ==\n`))
  }

  async runTask(task, { migrateTo, undoTo, migrationName }) {
    switch (task) {
      case 'db:reset':
        await this.undo(0)
        await this.migrate()
        break
      case 'db:migrate':
        await this.migrate(migrateTo)
        break
      case 'db:migrate:status':
        await this.printPending()
        break
      case 'db:migrate:history':
        await this.printExecuted()
        break
      case 'db:migrate:undo':
        await this.undo(undoTo)
        break
      case 'db:migrate:undo:all':
        await this.undo(0)
        break
      case 'migration:generate':
        if (!migrationName)
          throw new Error('Migration name should be specified.')

        await this.generate(migrationName)
        break
      default:
        if (task)
          throw new Error('Task not found.')

        console.log([
          'Available tasks:',
          '  - db:migrate [destination] - Execute all pending migrations [up to specified one]',
          '  - db:migrate:status - Show all pending migrations',
          '  - db:migrate:history - Show all executed migrations',
          '  - db:migrate:undo [destination] - Undo last executed migration or all down to destination if specified',
          '  - db:migrate:undo:all - Undo all executed migrations',
          '  - migration:generate <migration name> - Create a new empty migration file',
        ].join('\n'))
    }
  }

  /**
 * Executes all pending migrations up to specified one.
 * If destination is not specified, executes all pending migrations.
 *
 * @param {string} destination Migration destination.
 */
  async migrate(destination = undefined) {
    const migrations = destination !== undefined
      ? await umzug.up({ to: destination })
      : await umzug.up()

    if (migrations.length > 0) {
      console.log(`Executed ${migrations.length} migrations.`)
    } else {
      console.log('No migrations were executed.')
    }
  }

  async undo(destination) {
    const migrations = destination !== undefined
      ? await umzug.down({ to: destination })
      : await umzug.down()

    if (migrations.length > 0) {
      console.log(`Reverted ${migrations.length} migrations.`)
    } else {
      console.log('No migrations were reverted.')
    }
  }

  async printPending() {
    const migrations = await umzug.pending()

    if (migrations.length > 0) {
      console.log('Pending migrations:')
      this._printMigrations(migrations)
    } else {
      console.log('No pending migrations.')
    }
  }

  async printExecuted() {
    const migrations = await umzug.storage.executed()

    if (migrations.length > 0) {
      console.log('Executed migrations:')
      this._printMigrations(migrations)
    } else {
      console.log('No executed migrations.')
    }
  }

  async generate(migrationName) {
    const date = new Date()
    const timestamp = [
      date.getUTCFullYear(),
      this._format(date.getUTCMonth() + 1),
      this._format(date.getUTCDate()),
      this._format(date.getUTCHours()),
      this._format(date.getUTCMinutes()),
      this._format(date.getUTCSeconds())
    ].join('')

    const migrationFileName = `${timestamp}-${migrationName}.cjs`

    const source = path.resolve(process.cwd(), 'migrations', 'migration.sample.cjs')
    const target = path.resolve(process.cwd(), 'migrations', migrationFileName)

    const rs = fs.createReadStream(source)
    const ws = fs.createWriteStream(target)

    try {
      await new Promise((resolve, reject) => {
        rs.on('error', reject)
        ws.on('error', reject)
        ws.on('finish', resolve)

        rs.pipe(ws)
      })

      console.log(`Migration file '${migrationFileName}' has been created.`)
    } catch (error) {
      rs.destroy()
      ws.end()

      throw error
    }
  }

  _printMigrations(migrations) {
    migrations.forEach((migration, index) =>
      this._printMigration(migration, index + 1))
  }

  _printMigration(migration, index = undefined) {
    const fileName = (migration.name || migration).replace('.cjs', '')
    const prefix = index !== undefined ? `${index})` : '-'

    console.log(`  ${prefix} ${fileName}`)
  }

  _format(number) {
    return number.toString().padStart(2, '0')
  }
}

const cli = new MigrationsCli()

const task = process.argv[2]
const options = {}

if (task === 'db:migrate')
  options.migrateTo = process.argv[3]
else if (task === 'db:migrate:undo')
  options.undoTo = process.argv[3]
else if (task === 'migration:generate')
  options.migrationName = process.argv[3]

cli.runTask(task, options)
  .then(() => process.exit())
  .catch((error) => {
    console.log('Error:', error.message)

    process.exit(1)
  })
