import { Request as ExpressRequest } from 'express-serve-static-core'

declare module 'express-serve-static-core' {
  interface Request extends ExpressRequest {
    user: {
      id: string
      name: string
      username?: string
    }
    file?: {
      buffer: Buffer
      mimetype: string
      size: number
    }
  }
}
