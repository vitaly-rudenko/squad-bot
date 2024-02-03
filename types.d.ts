import { User } from './app/users/User.js';

declare global {
  namespace Express {
    export interface Request {
      user: User;
      file?: Multer.File;
    }
  }
}
