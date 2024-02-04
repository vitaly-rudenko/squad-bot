export class Receipt {
  /**
   * @param {{
   *   id?: string
   *   payerId: string
   *   amount: number
   *   description?: string
   *   hasPhoto: boolean
   *   createdAt?: Date
   * }} input
   */
  constructor({ id, payerId, amount, description, hasPhoto = false, createdAt = new Date() }) {
    this.id = id
    this.payerId = payerId
    this.amount = amount
    this.description = description
    this.hasPhoto = hasPhoto
    this.createdAt = createdAt
  }
}
