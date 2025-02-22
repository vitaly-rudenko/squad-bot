export type RollCall = {
  id: number
  groupId: string
  messagePattern: string
  usersPattern: string
  excludeSender: boolean
  pollOptions: string[]
  isMultiselectPoll: boolean
  isAnonymousPoll: boolean
  sortOrder: number
}
