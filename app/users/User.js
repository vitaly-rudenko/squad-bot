export class User {
  /**
   * @param {{
   *   id: string
   *   name: string
   *   username?: string
   *   locale?: string
   *   isComplete?: boolean
   * }} input
   */
  constructor({ id, name, username, locale = 'uk', isComplete = false }) {
    this.id = id
    this.username = username
    this.name = name
    this.locale = locale
    this.isComplete = isComplete
  }
}
