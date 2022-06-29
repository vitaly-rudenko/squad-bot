export class UserSessionManager {
  constructor({ phasesCache, contextsCache }) {
    this._phases = phasesCache
    this._contexts = contextsCache
  }

  async setPhase(userId, phase) {
    await this._phases.set(userId, phase)
  }

  async getPhase(userId) {
    return await this._phases.get(userId)
  }

  async getContext(userId) {
    return await this._contexts.get(userId)
  }

  async setContext(userId, context) {
    await this._contexts.set(userId, context)
  }

  async clear(userId) {
    await this._phases.delete(userId)
    await this._contexts.delete(userId)
  }
}
