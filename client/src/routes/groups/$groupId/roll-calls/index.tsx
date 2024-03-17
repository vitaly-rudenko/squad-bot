import { RollCalls } from '@/roll-calls/roll-calls'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/groups/$groupId/roll-calls/')({
  component: RollCallsComponent,
})

function RollCallsComponent() {
  const params = Route.useParams()

  return <RollCalls groupId={params.groupId} />
}
