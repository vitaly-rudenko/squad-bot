export type SocialLink = {
  url: string
  linkMessage: { chatId: string; messageId: string }
  simpleFixMessage?: { chatId: string; messageId: string }
  advancedIntegrationInitialMessage?: { chatId: string; messageId: string }
}
