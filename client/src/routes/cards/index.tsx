import { Cards } from '@/cards/cards'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cards/')({
  component: CardsComponent,
})

function CardsComponent() {
  return <Cards />
}
