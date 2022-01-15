import dotenv from 'dotenv'
import { Umzug } from 'umzug'
import pg from 'pg'
import { PostgresStorage } from './PostgresStorage.js'

if (process.env.USE_NATIVE_ENV !== 'true') {
  console.log('Using .env file')
  dotenv.config()
}

const client = new pg.Client(process.env.DATABASE_URL)
client.connect()

export const umzug = new Umzug({
  migrations: { glob: 'migrations/*-*.cjs' },
  context: client,
  storage: new PostgresStorage(client, 'migrations_meta'),
  logger: console,
})
