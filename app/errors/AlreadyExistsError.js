export class AlreadyExistsError extends Error {
  constructor(message = 'Item already exists') {
    super(message)
    this.code = 'ALREADY_EXISTS'
  }
}
