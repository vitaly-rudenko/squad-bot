export type Countdown = {
  id: number
  groupId: string
  title: string
  endsAt: Date
  hasEnded: boolean
  nextReminderAt: Date | null
}
