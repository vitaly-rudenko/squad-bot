export class User {
  constructor({ id, name, username = null, locale = 'uk', isComplete = false }) {
    this.id = id
    this.username = username
    this.name = name
    this.locale = locale
    this.isComplete = isComplete
  }
}
