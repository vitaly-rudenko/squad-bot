import { TelegramClient } from 'telegram'
import readline from 'readline'
import { StringSession } from 'telegram/sessions/index.js'

const telegramAppId = Number(process.env.TELEGRAM_APP_ID!)
const telegramAppHash = process.env.TELEGRAM_APP_HASH!
const session = new StringSession('')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const client = new TelegramClient(session, telegramAppId, telegramAppHash, { connectionRetries: 5 })

await client.start({
  phoneNumber: async () => new Promise(resolve => rl.question('Please enter your number: ', resolve)),
  password: async () => new Promise(resolve => rl.question('Please enter your password: ', resolve)),
  phoneCode: async () => new Promise(resolve => rl.question('Please enter the code you received: ', resolve)),
  onError: err => console.log(err),
})

const sessionString = client.session.save()
console.log('Session string:', sessionString)

process.exit(0)
