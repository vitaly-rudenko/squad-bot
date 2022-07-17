import pino from 'pino'
import { logLevel } from './env.js'

console.log('Log level:', logLevel)

export const logger = pino({
  level: logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: true,
    }
  }
})
