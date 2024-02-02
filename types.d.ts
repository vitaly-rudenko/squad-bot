import { User } from './app/users/User';

declare global {
  namespace Express {
    export interface Request {
      user: User;
    }
  }
}
