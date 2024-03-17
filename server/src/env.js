import { literal, union, defaulted, coerce, boolean, optional, type, refine, string, number, nonempty, array } from 'superstruct';

const optionalBooleanSchema = coerce(
  boolean(),
  optional(union([literal('true'), literal('false')])),
  (value) => value === 'true'
);

const logLevelSchema = defaulted(union([
  literal('trace'),
  literal('debug'),
  literal('info'),
  literal('warn'),
  literal('error'),
  literal('fatal'),
]), 'info');

const urlSchema = refine(nonempty(string()), 'url', (value) => {
  try { new URL(value) } catch { return false }
  return true
})

const numberSchema = coerce(number(), nonempty(string()), (value) => Number(value))
const stringSchema = nonempty(string())

const urlArraySchema = coerce(
  nonempty(array(urlSchema)),
  nonempty(string()),
  (value) => value.split(',').map((item) => item.trim())
)

const envSchema = type({
  PORT: numberSchema,
  LOG_LEVEL: logLevelSchema,
  USE_TEST_MODE: optionalBooleanSchema,
  ENABLE_TEST_HTTPS: optionalBooleanSchema,
  REDIS_URL: urlSchema,
  DATABASE_URL: urlSchema,
  LOG_DATABASE_QUERIES: optionalBooleanSchema,
  DISABLE_MEMBERSHIP_REFRESH_TASK: optionalBooleanSchema,
  DEBUG_CHAT_ID: numberSchema,
  TELEGRAM_BOT_TOKEN: stringSchema,
  TOKEN_SECRET: stringSchema,
  WEB_APP_URL: urlSchema,
  WEB_APP_NAME: stringSchema,
  CORS_ORIGIN: urlArraySchema,
  OCR_SPACE_API_KEY: stringSchema,
  OCR_SPACE_ENDPOINT: urlSchema,
})

export const env = envSchema.create(process.env)
