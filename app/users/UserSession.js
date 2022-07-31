export class UserSession {
  constructor({ userId, chatId }, { phasesCache, contextsCache }) {
    this._key = `${chatId}:${userId}`
    this._phases = phasesCache
    this._contexts = contextsCache
  }

  async setPhase(phase) {
    await this._phases.set(this._key, phase)
  }

  async getPhase() {
    return await this._phases.get(this._key)
  }

  async getContext() {
    return await this._contexts.get(this._key)
  }

  async setContext(context) {
    await this._contexts.set(this._key, context)
  }

  async amendContext(context) {
    await this._contexts.set(this._key, {
      ...await await this._contexts.get(this._key),
      ...context,
    })
  }

  async clear() {
    await this._phases.delete(this._key)
    await this._contexts.delete(this._key)
  }
}
