import { Cache } from './Cache.js'

export class UserSessionManager {
  constructor() {
    this._phases = new Cache(60 * 60_000);
    this._contexts = new Cache(60 * 60_000);
  }

  setPhase(userId, phase) {
    this._phases.set(userId, { phase });
  }

  getPhase(userId) {
    return this._phases.get(userId)?.phase ?? null;
  }

  context(userId) {
    if (!this._contexts.get(userId)) {
      this._contexts.set(userId, {});
    }

    return this._contexts.get(userId);
  }

  clear(userId) {
    this._phases.delete(userId);
    this._contexts.delete(userId);
  }
}
