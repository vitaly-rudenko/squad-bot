export type RollCall = {
  id: string
  groupId: string
  messagePattern: string
  usersPattern: string
  excludeSender: boolean
  pollOptions: string[]
  sortOrder: number
}
