export class ApiError extends Error {
  /**
   * @param {{
   *   code: string
   *   status?: number
   *   message?: string
   *   context?: any
   * }} input
   */
  constructor({ code, status = 500, message = '', context }) {
    super(message)
    this.code = code
    this.status = status
    this.context = context
  }
}

export class NotFoundError extends ApiError {
  /** @param {string} [message] */
  constructor(message = 'Resource not found') {
    super({ code: 'NOT_FOUND', status: 404, message })
  }
}

export class NotAuthenticatedError extends ApiError {
  /** @param {string} [message] */
  constructor(message = 'Not authenticated') {
    super({ code: 'NOT_AUTHENTICATED', status: 403, message })
  }
}

export class NotAuthorizedError extends ApiError {
  /** @param {string} [message] */
  constructor(message = 'Access denied') {
    super({ code: 'NOT_AUTHORIZED', status: 403, message })
  }
}

export class AlreadyExistsError extends ApiError {
  /** @param {string} [message] */
  constructor(message = 'Resource already exists') {
    super({ code: 'ALREADY_EXISTS', status: 409, message })
  }
}
