import { useWebApp } from '@/web-app/hooks'
import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  const { command } = useWebApp()

  if (command?.type === 'receipts')
    return <Navigate to='/receipts' />
  if (command?.type === 'payments')
    return <Navigate to='/payments' />
  if (command?.type === 'groups')
    return <Navigate to='/groups' />
  if (command?.type === 'cards')
    return <Navigate to='/cards' />
  if (command?.type === 'roll-calls')
    return <Navigate to='/groups/$groupId/roll-calls' params={command.params} />
  if (command?.type === 'titles')
    return <Navigate to='/groups/$groupId/titles' params={command.params} />

  if (command?.type === 'receipt')
    return <Navigate to='/receipts/$receiptId' params={command.params} />
  if (command?.type === 'payment')
    return <Navigate to='/payments/$paymentId' params={command.params} search={command.search} />
  if (command?.type === 'card')
    return <Navigate to='/cards/$cardId' params={command.params} />
  if (command?.type === 'roll-call')
    return <Navigate to='/groups/$groupId/roll-calls/$rollCallId' params={command.params} />

  return <Navigate to='/receipts' />
}
