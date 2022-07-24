export class RollCall {
  constructor({ id = undefined, groupId, messagePattern, usersPattern, excludeSender, pollOptions, sortOrder }) {
    this.id = id
    this.groupId = groupId
    this.messagePattern = messagePattern
    this.usersPattern = usersPattern
    this.excludeSender = excludeSender
    this.pollOptions = pollOptions
    this.sortOrder = sortOrder
  }
}