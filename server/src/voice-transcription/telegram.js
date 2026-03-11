import fs from 'fs/promises'
import { Markup } from 'telegraf'
import { env } from '../env.js'
import { registry } from '../registry.js'
import { isGroupChat } from '../common/telegram.js'
import { logger } from '../common/logger.js'
import { downloadFile } from '../common/download-file.ts'
import { transcribe } from '../common/transcribe.ts'
import { splitIntoParagraphs } from '../common/split-into-paragraphs.ts'
import { summarize } from '../common/summarize.ts'
import { scheduleReplyMarkupRemoval } from '../common/schedule-reply-markup-removal.ts'

export function createVoiceTranscriptionFlow() {
  const { groupCache, groupStorage, localize, telegram } = registry.export()

  /** @param {import('telegraf').Context} context */
  const toggleVoiceTranscription = async context => {
    const { userId, chatId, locale } = context.state

    if (env.ADMIN_USER_ID !== userId) return

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

  /** @param {import('telegraf').Context} context */
  const voiceMessage = context => {
    ;(async () => {
      if (!context.message || !('voice' in context.message)) return

      const { userId, chatId, locale } = context.state

      if (isGroupChat(context)) {
        // Ignore short and forwarded messages
        if (context.message.voice.duration < 10) return
        if (context.message.forward_origin) return

        let group = await groupCache.get(chatId)
        if (!group) {
          group = await groupStorage.findById(chatId)
          if (group) {
            await groupCache.set(chatId, group)
          }
        }

        if (!group) return
        if (!group.voiceTranscriptionEnabledAt) return
      } else if (userId !== env.ADMIN_USER_ID) {
        return
      }

      const operationId = crypto.randomUUID()
      const oggPath = `/app/local/operations/${operationId}/input.ogg`

      try {
        const statusMessage = await context.sendMessage(`<blockquote><i>${localize(locale, 'voiceTranscription.transcribing')}</i></blockquote>`, {
          parse_mode: 'HTML',
          reply_parameters: {
            chat_id: context.message.chat.id,
            message_id: context.message.message_id,
            allow_sending_without_reply: true,
          },
        })

        await fs.mkdir(`/app/local/operations/${operationId}`, { recursive: true })

        logger.info({ fileId: context.message.voice.file_id }, 'Downloading')
        const url = await telegram.getFileLink(context.message.voice.file_id)
        await downloadFile({ url, outputPath: oggPath })

        logger.info({ oggPath }, 'Transcribing')
        const { text, durationMs } = await transcribe({
          inputPath: oggPath,
          apiKey: env.OPENAI_API_KEY,
        })

        logger.info({ durationMs }, 'Transcription completed')

        const expectedChars = context.message.voice.duration * 10
        if (text.length < expectedChars * 0.2) {
          logger.info({ textLength: text.length, expectedChars }, 'Transcription too short, ignoring')
          await telegram.deleteMessage(statusMessage.chat.id, statusMessage.message_id).catch(() => {})
          return
        }

        const expandable = context.message.voice.duration > 60 ? ' expandable' : ''

        let html
        if (context.message.voice.duration >= 90) {
          const summary = await summarize({ text, apiKey: env.OPENAI_API_KEY })
          html = `<blockquote${expandable}>${splitIntoParagraphs(text)}</blockquote>\n\n<i>${summary}</i>`
        } else {
          html = `<blockquote${expandable}>${splitIntoParagraphs(text)}</blockquote>`
        }

        await telegram.editMessageText(statusMessage.chat.id, statusMessage.message_id, undefined, html, {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            Markup.button.callback(localize(locale, 'voiceTranscription.actions.accept'), 'delete_reply_markup'),
            Markup.button.callback(localize(locale, 'voiceTranscription.actions.reject'), 'delete_message'),
          ]),
        })

        scheduleReplyMarkupRemoval(statusMessage)
      } catch (err) {
        logger.warn('Could not transcribe voice message:', err)
      } finally {
        await fs.rm(`/app/local/operations/${operationId}`, { recursive: true, force: true }).catch(() => {})
      }
    })()
  }

  return {
    toggleVoiceTranscription,
    voiceMessage,
  }
}
