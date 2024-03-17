import { registry } from '../registry.js'
import { escapeMd, isNotificationErrorIgnorable } from '../common/telegram.js'
import { logger } from '../common/logger.js'
import { getPhotoPath } from './filesystem.js'
import { createReadStream } from 'fs'
import { array, nonempty, string } from 'superstruct'

export function createReceiptsFlow() {
  const { localize, generateWebAppUrl } = registry.export()

  /** @param {import('telegraf').Context} context */
  const receipts = async (context) => {
    const { locale } = context.state

    const viewUrl = generateWebAppUrl('receipts')

    await context.reply(
      localize(locale, 'receipts.command.message', {
        viewUrl: escapeMd(viewUrl),
      }),
      {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }
    )
  }

  const matchSchema = array(nonempty(string()))

  /** @param {import('telegraf').Context} context */
  const getPhoto = async (context) => {
    if (!('match' in context)) return
    const { locale } = context.state

    await Promise.allSettled([
      context.editMessageReplyMarkup(undefined).catch(() => {}),
      context.answerCbQuery(localize(locale, 'receipts.actions.sendingPhoto')),
    ])

    const reply_to_message_id = context.callbackQuery?.message?.message_id
    const photoFilename = matchSchema.create(context.match)[1]

    const source = createReadStream(getPhotoPath(photoFilename))
    source.on('error', async (err) => {
      if (!('code' in err) || err.code !== 'ENOENT') {
        logger.error({ err, photoFilename }, 'Could not read photo')
      }

      await context.reply(
        localize(locale, 'receipts.actions.failedToSendPhoto'),
        { parse_mode: 'MarkdownV2', reply_to_message_id }
      )
    })

    try {
      await context.sendPhoto({ source }, { reply_to_message_id })
    } catch (err) {
      if (!isNotificationErrorIgnorable(err)) {
        logger.warn({ err, user: context.from, photoFilename }, 'Could not send photo')
      }
    }
  }

  return { receipts, getPhoto }
}
