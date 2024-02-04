export class Card {
  /**
   * @param {{
   *   id?: string
   *   userId: string
   *   number: string
   *   bank: string
   * }} input
   */
  constructor({ id, userId, number, bank }) {
    this.id = id
    this.userId = userId
    this.number = number
    this.bank = bank
  }
}
