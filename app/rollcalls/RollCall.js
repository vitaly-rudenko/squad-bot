export class RollCall {
  /**
   * @param {{
   *   id?: string
   *   groupId: string
   *   messagePattern: string
   *   usersPattern: string
   *   excludeSender: boolean
   *   pollOptions: string[]
   *   sortOrder: number
   * }} input
   */
  constructor({ id, groupId, messagePattern, usersPattern, excludeSender, pollOptions, sortOrder }) {
    this.id = id
    this.groupId = groupId
    this.messagePattern = messagePattern
    this.usersPattern = usersPattern
    this.excludeSender = excludeSender
    this.pollOptions = pollOptions
    this.sortOrder = sortOrder
  }
}