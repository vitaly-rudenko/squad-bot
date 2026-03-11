import OpenAI from 'openai'

export async function summarize(input: { text: string; apiKey: string }): Promise<string> {
  const openai = new OpenAI({ apiKey: input.apiKey })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: [
          'Generate a condensed summary of the provided voice message transcription.',
          'The summary must be very short (under 30 words), but absolutely packed with details.',
          'Ignore filler words, greetings, generic or useless information.',
          'If multiple topics are discussed, split them with semicolon.',
          'The summary must be in the same language as the voice message itself.',
        ].join('\n'),
      },
      { role: 'user', content: input.text },
    ],
  })

  return response.choices[0].message.content ?? ''
}
