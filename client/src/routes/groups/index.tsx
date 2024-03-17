import { Groups } from '@/groups/groups'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/groups/')({
  component: GroupsComponent,
})

function GroupsComponent() {
  return <Groups />
}
