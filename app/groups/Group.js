export class Group {
  constructor({ id, title, updatedAt = undefined }) {
    this.id = id
    this.title = title
    this.updatedAt = updatedAt
  }
}