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
    const createUrl = generateWebAppUrl('new-receipt')

    await context.reply(
      localize(locale, 'receipts.command.message', {
        viewUrl: escapeMd(viewUrl),
        createUrl: escapeMd(createUrl),
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

    await context.answerCbQuery(localize(locale, 'receipts.actions.sendingPhoto'))
    await context.editMessageReplyMarkup(undefined)

    const photoFilename = matchSchema.create(context.match)[1]
    await context.sendPhoto(
      { source: createReadStream(getPhotoPath(photoFilename)) },
    ).catch((err) => {
      if (!isNotificationErrorIgnorable(err)) {
        logger.warn({ err, user: context.from, photoFilename }, 'Could not send photo')
      }
    })
  }

  return { receipts, getPhoto }
}
