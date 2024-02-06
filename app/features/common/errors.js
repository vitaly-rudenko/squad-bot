import { ApiError } from '../../ApiError.js'

export class NotFoundError extends ApiError {
  constructor() {
    super({ code: 'NOT_FOUND', status: 404, message: 'Resource not found' })
  }
}

export class NotAuthorizedError extends ApiError {
  constructor() {
    super({ code: 'NOT_AUTHORIZED', status: 403, message: 'Access denied' })
  }
}
