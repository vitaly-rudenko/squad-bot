import OpenAI from 'openai'

export async function summarize(input: {
  text: string
  apiKey: string
}): Promise<string> {
  const openai = new OpenAI({ apiKey: input.apiKey })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Summarize the given voice message transcription in one short sentence (under 30 words). The summary MUST be in the same language as the transcription. Include key specific details (names, numbers, decisions) but do not try to cover everything. Skip filler and context the listener already knows.

Examples:

Input: "Привет, слушай, я тут подумал насчёт того проекта, ну который мы обсуждали на прошлой неделе с Андреем. Короче, я поговорил с заказчиком, и они согласились сдвинуть дедлайн на две недели, то есть теперь у нас до 20 марта."
Output: "Заказчик согласился сдвинуть дедлайн проекта с Андреем на две недели, до 20 марта."

Input: "Короче, я только что закончил звонок с дизайн-командой, и они говорят что новые макеты не будут готовы до четверга, так что нам нужно перенести ревью на пятницу на 3 часа дня, можешь обновить приглашение в календаре?"
Output: "Макеты задерживаются до четверга, автор просит перенести ревью на пятницу на 15:00."

Input: "Hey so I just got off the call with the design team and they're saying the new mockups won't be ready until Thursday, so we'll need to push the review meeting to Friday at 3pm, can you update the calendar invite?"
Output: "Design mockups delayed to Thursday; asking to move review meeting to Friday 3pm."

Input: "So yeah I talked to Mike from accounting and he said we need to submit all the Q2 expense reports by next Wednesday, and also there's a new policy where anything over five hundred dollars needs manager approval before you can even file it."
Output: "Mike from accounting says Q2 expense reports due next Wednesday; new policy requires manager approval for expenses over $500."

Input: "Привіт, слухай, я тут подумав щодо того проєкту, ну який ми обговорювали минулого тижня з Андрієм. Коротше, я поговорив із замовником, і вони погодились зсунути дедлайн на два тижні, тобто тепер у нас до 20 березня."
Output: "Замовник погодився зсунути дедлайн проєкту з Андрієм на два тижні, до 20 березня."

Input: "Коротше, я сьогодні їздив у сервіс, і мені сказали що треба міняти гальмівні колодки і ще якийсь датчик, загалом на все про все виходить тисяч двадцять п'ять, я вирішив поки не робити, почекаю до наступного місяця."
Output: "У сервісі сказали міняти колодки й датчик за 25 тисяч, автор вирішив відкласти до наступного місяця."

Rules:
- The summary MUST be in the same language as the transcription. English → English, Russian → Russian, Ukrainian → Ukrainian. Never translate.
- Keep it under 30 words, one sentence.
- Include key specific details: names, numbers, decisions.
- Skip filler words, greetings, and context the listener already knows.`,
      },
      { role: 'user', content: input.text },
    ],
  })

  return response.choices[0].message.content ?? ''
}
