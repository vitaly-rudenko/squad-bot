export class Card {
  constructor({ id = undefined, userId, number, bank }) {
    this.id = id
    this.userId = userId
    this.number = number
    this.bank = bank
  }
}
