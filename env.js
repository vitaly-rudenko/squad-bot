import dotenv from 'dotenv'
import { logger } from './logger.js'

if (process.env.USE_NATIVE_ENV !== 'true') {
  logger.warn('Using .env file')
  dotenv.config()
}

export const useTestMode = process.env.USE_TEST_MODE === 'true'
