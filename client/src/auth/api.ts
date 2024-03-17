import { callApi } from '@/utils/api'

export const authenticate = async (input: { code: string } | { webAppInitData: typeof Telegram.WebApp.initData }): Promise<string> => {
  let response: Response
  if ('code' in input) {
    response = await callApi(`/authenticate?code=${input.code}`)
  } else {
    response = await callApi('/authenticate-web-app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ initData: input.webAppInitData }),
    })
  }

  const token = await response.json()
  if (typeof token !== 'string') {
    console.warn(token)
    throw new Error('Could not get authentication token')
  }

  return token
}
