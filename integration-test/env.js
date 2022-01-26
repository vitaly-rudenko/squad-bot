import dotenv from 'dotenv'

if (process.env.USE_NATIVE_ENV !== 'true') {
  console.log('Using .env file')
  dotenv.config()
}

export const TOKEN_SECRET = process.env.TOKEN_SECRET
