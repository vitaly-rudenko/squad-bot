import { UserSession } from './UserSession.js'

export function createUserSessionFactory({ phasesCache, contextsCache }) {
  return ({ chatId, userId }) => new UserSession({ chatId, userId }, { phasesCache, contextsCache })
}