export class RollCall {
  constructor({ id = undefined, chatId, messagePattern, usersPattern, excludeSender }) {
    this.id = id
    this.chatId = chatId
    this.messagePattern = messagePattern
    this.usersPattern = usersPattern
    this.excludeSender = excludeSender
  }
}