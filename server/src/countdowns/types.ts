export type Countdown = {
  id: number
  chatId: string
  title: string
  endsAt: Date
  endedAt: Date | null
  nextReminderAt: Date | null
}
