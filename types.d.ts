import { User } from './app/users/User.js';

declare module 'express-serve-static-core' {
  interface Request {
    user: User;
    file?: {
      buffer: Buffer
      mimetype: string
      size: number
    };
  }
}
