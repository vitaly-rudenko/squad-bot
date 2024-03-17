import { TitleEditor } from '@/titles/title-editor'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/groups/$groupId/titles/')({
  component: TitleEditorComponent,
})

function TitleEditorComponent() {
  const params = Route.useParams()

  return <TitleEditor groupId={params.groupId} />
}