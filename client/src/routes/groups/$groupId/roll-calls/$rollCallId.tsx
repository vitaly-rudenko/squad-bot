import { RollCallEditor } from '@/roll-calls/roll-call-editor'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/groups/$groupId/roll-calls/$rollCallId')({
  component: RollCallComponent,
})

function RollCallComponent() {
  const params = Route.useParams()

  return <RollCallEditor
    groupId={params.groupId}
    rollCallId={params.rollCallId === 'new' ? undefined : params.rollCallId}
  />
}