import * as http from 'http';
import { ParsedQs } from 'qs';

declare module 'express-serve-static-core' {
  export interface Request<
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    LocalsObj extends Record<string, any> = Record<string, any>,
  > extends http.IncomingMessage, Express.Request {
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
