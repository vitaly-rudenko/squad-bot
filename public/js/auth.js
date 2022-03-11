
let resolveAuthPromise, authPromise = new Promise(resolve => resolveAuthPromise = resolve)
let authToken

init()
  .catch((error) => {
    console.log('Could not authenticate:', error)
    logOut()
  })

async function init() {
  console.log('Authenticating...')

  const query = new URLSearchParams(location.search)
  const queryToken = query.get('token')

  const localToken = localStorage.getItem('auth_token_v1')

  if (queryToken) {
    console.log('Exchanging token for a permanent one...')
    const response = await (await fetch(`/authenticate?token=${queryToken}`)).json()

    if (typeof response === 'string') {
      completeAuth(response)
      return
    }

    console.log('Could not exchange token:', response)
  }
  
  if (localToken) {
    console.log('Using local authentication token')
    completeAuth(localToken)
    return
  }

  console.log('No token has been found, authentication failed')
  redirectToAuthPage()
}

function completeAuth(token) {
  localStorage.setItem('auth_token_v1', token)
  authToken = token
  console.log('Current user:', getCurrentUser())


  

  const authInfo = document.createElement('div')
  authInfo.id = 'auth-info'

  const authInfoText = document.createElement('p')
  authInfoText.innerText= `Авторизован как: ${getCurrentUser().name} (@${getCurrentUser().username})`

  authInfo.appendChild(authInfoText)

  authInfoText.addEventListener('click', () => {
    if(confirm(`Выйти из аккаунта "${getCurrentUser().name}"?`)) {
      logOut()
    }
  })

  document.body.appendChild(authInfo)

  resolveAuthPromise()
}

function logOut() {
  authToken = null
  localStorage.removeItem('auth_token_v1')
  redirectToAuthPage()
}

function waitForAuth() {
  return authPromise
}

function getCurrentUser() {
  return parseJwt(authToken).user
}

function createAuthorizationHeader() {
  if (!authToken) throw new Error('Auth token is not available yet')
  return { 'Authorization': `Bearer ${authToken}` }
}

function redirectToAuthPage() {
  window.open('/authpage', '_self')
}

function parseJwt(token) {
  var base64Url = token.split('.')[1]
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  }).join(''))

  return JSON.parse(jsonPayload)
}
