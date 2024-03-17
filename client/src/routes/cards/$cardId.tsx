import { CardEditor } from '@/cards/card-editor'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cards/$cardId')({
  component: CardComponent,
})

function CardComponent() {
  return <CardEditor />
}
