export class User {
  /**
   * @param {{
   *   id: string
   *   name: string
   *   username?: string
   *   locale?: string
   * }} input
   */
  constructor({ id, name, username, locale = 'uk' }) {
    this.id = id
    this.username = username
    this.name = name
    this.locale = locale
  }
}
