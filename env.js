import dotenv from 'dotenv'

if (process.env.USE_NATIVE_ENV !== 'true') {
  console.log('Using .env file')
  dotenv.config()
}

export const useTestMode = process.env.USE_TEST_MODE === 'true'
export const logLevel = process.env.LOG_LEVEL || 'info'
export const disableTelegramApi = process.env.DISABLE_TELEGRAM_API === 'true'
