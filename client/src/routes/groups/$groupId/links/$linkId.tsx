import { LinkEditor } from '@/links/link-editor'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/groups/$groupId/links/$linkId')({
  component: LinkComponent,
})

function LinkComponent() {
  const params = Route.useParams()

  return <LinkEditor
    groupId={params.groupId}
    linkId={params.linkId === 'new' ? undefined : params.linkId}
  />
}