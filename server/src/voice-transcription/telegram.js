import { registry } from '../registry.js'

export function createVoiceTranscriptionFlow() {
  const { groupCache, groupStorage, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const toggleVoiceTranscription = async context => {
    const { chatId, locale } = context.state

    const group = await groupStorage.findById(chatId)
    if (!group) return

    await groupStorage.store({
      id: group.id,
      title: group.title,
      voiceTranscriptionEnabledAt: group.voiceTranscriptionEnabledAt ? null : new Date(),
    })
    await groupCache.delete(chatId)

    await context.reply(
      localize(
        locale,
        group.voiceTranscriptionEnabledAt ? 'voiceTranscription.disabled' : 'voiceTranscription.enabled',
      ),
    )
  }

  return {
    toggleVoiceTranscription,
  }
}
