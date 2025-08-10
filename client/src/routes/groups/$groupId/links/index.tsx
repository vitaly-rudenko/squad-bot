import { Links } from '@/links/links'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/groups/$groupId/links/')({
  component: LinksComponent,
})

function LinksComponent() {
  const params = Route.useParams()

  return <Links groupId={params.groupId} />
}