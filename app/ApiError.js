export class ApiError extends Error {
  /**
   * @param {{
   *   code: string
   *   status?: number
   *   message?: string
   *   context?: any
   * }} input
   */
  constructor({ code, status = 500, message = code, context }) {
    super(message)
    this.code = code
    this.status = status
    this.context = context
  }
}
