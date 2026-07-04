import fs from 'fs/promises'
import { Markup } from 'telegraf'
import { env } from '../env.js'
import { registry } from '../registry.js'
import { isGroupChat } from '../common/telegram.js'
import { logger } from '../common/logger.js'
import { downloadFile } from '../common/download-file.ts'
import { transcribe } from '../common/transcribe.ts'
import { splitIntoParagraphs } from '../common/split-into-paragraphs.ts'
import { scheduleReplyMarkupRemoval } from '../common/schedule-reply-markup-removal.ts'

/**
 * @param {import('@telegraf/types').Message} message
 * @returns {{ fileId: string, durationMs: number, extension: 'ogg' | 'mp4', minDurationMs: number, expectedCharsThreshold: number, minTextLength: number } | undefined}
 */
function getTranscriptionMedia(message) {
  if ('voice' in message) {
    return {
      fileId: message.voice.file_id,
      durationMs: message.voice.duration * 1000,
      extension: 'ogg',
      minDurationMs: 5_000,
      expectedCharsThreshold: 0.2,
      minTextLength: 10,
    }
  }

  if ('video_note' in message) {
    return {
      fileId: message.video_note.file_id,
      durationMs: message.video_note.duration * 1000,
      extension: 'mp4',
      minDurationMs: 10_000,
      expectedCharsThreshold: 0.4,
      minTextLength: 20,
    }
  }

  return undefined
}

export function createMediaTranscriptionFlow() {
  const { groupCache, groupStorage, localize, telegram } = registry.export()

  /** @param {import('telegraf').Context} context */
  const toggleMediaTranscription = async context => {
    const { userId, chatId, locale } = context.state

    if (env.ADMIN_USER_ID !== userId) return

    const group = await groupStorage.findById(chatId)
    if (!group) return

    await groupStorage.store({
      id: group.id,
      title: group.title,
      mediaTranscriptionEnabledAt: group.mediaTranscriptionEnabledAt ? null : new Date(),
    })
    await groupCache.delete(chatId)

    await context.reply(
      localize(
        locale,
        group.mediaTranscriptionEnabledAt ? 'mediaTranscription.disabled' : 'mediaTranscription.enabled',
      ),
    )
  }

  /** @param {import('telegraf').Context} context */
  const transcribeMedia = context => {
    ;(async () => {
      if (!context.message) return

      const media = getTranscriptionMedia(context.message)
      if (!media) return

      const { userId, chatId, locale } = context.state

      if (isGroupChat(context)) {
        // Ignore short and forwarded messages
        if (media.durationMs < media.minDurationMs) return
        if ('forward_origin' in context.message) return

        let group = await groupCache.get(chatId)
        if (!group) {
          group = await groupStorage.findById(chatId)
          if (group) {
            await groupCache.set(chatId, group)
          }
        }

        if (!group) return
        if (!group.mediaTranscriptionEnabledAt) return
      } else if (userId !== env.ADMIN_USER_ID) {
        return
      }

      const operationId = crypto.randomUUID()
      const inputPath = `/app/local/operations/${operationId}/input.${media.extension}`

      try {
        const replyMarkup = Markup.inlineKeyboard([
          Markup.button.callback(localize(locale, 'common.actions.deleteMessage'), 'delete_message'),
        ])

        const statusMessage = await context.sendMessage(
          `<blockquote><i>${localize(locale, 'mediaTranscription.transcribing')}</i></blockquote>`,
          {
            parse_mode: 'HTML',
            reply_parameters: {
              chat_id: context.message.chat.id,
              message_id: context.message.message_id,
              allow_sending_without_reply: true,
            },
            ...replyMarkup,
          },
        )

        await fs.mkdir(`/app/local/operations/${operationId}`, { recursive: true })

        logger.info({ fileId: media.fileId }, 'Downloading')
        const url = await telegram.getFileLink(media.fileId)
        await downloadFile({ url, outputPath: inputPath })

        logger.info({ inputPath }, 'Transcribing')
        const { text, durationMs } = await transcribe({
          inputPath,
          apiKey: env.OPENAI_API_KEY,
        })

        logger.info({ durationMs }, 'Transcription completed')

        const expectedChars = media.durationMs / 100
        const minExpectedTextLength = Math.max(media.minTextLength, expectedChars * media.expectedCharsThreshold)
        if (text.length < minExpectedTextLength) {
          logger.info({ textLength: text.length, minExpectedTextLength }, 'Transcription too short, ignoring')
          await telegram.deleteMessage(statusMessage.chat.id, statusMessage.message_id).catch(() => {})
          return
        }

        const expandable = media.durationMs >= 90_000 ? ' expandable' : ''
        const html = `<blockquote${expandable}>${splitIntoParagraphs(text)}</blockquote>`

        await telegram.editMessageText(statusMessage.chat.id, statusMessage.message_id, undefined, html, {
          parse_mode: 'HTML',
          ...replyMarkup,
        })

        scheduleReplyMarkupRemoval(statusMessage, 30_000)
      } catch (err) {
        logger.warn('Could not transcribe media message:', err)
      } finally {
        await fs.rm(`/app/local/operations/${operationId}`, { recursive: true, force: true }).catch(() => {})
      }
    })()
  }

  return {
    toggleMediaTranscription,
    transcribeMedia,
  }
}
