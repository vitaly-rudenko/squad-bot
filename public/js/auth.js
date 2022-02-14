
let resolveAuthPromise, authPromise = new Promise(resolve => resolveAuthPromise = resolve)
let authToken

init()
async function init() {
  console.log('Authenticating...')

  const localToken = localStorage.getItem('auth_token_v1')
  if (localToken) {
    console.log('Using local authentication token')
    completeAuth(localToken)
    return
  }

  const query = new URLSearchParams(location.search)
  if (!query.has('token')) {
    redirectToAuthPage()
    return
  }

  const temporaryToken = query.get('token')
  console.log('Exchanging a temporary token for a permanent one')

  const response = await (await fetch(`/auth-token?temporary_auth_token=${temporaryToken}`)).json()

  if (response.authToken) {
    completeAuth(response.authToken)
  } else {
    console.log('Could not exchange auth token:', response)
    redirectToAuthPage()
    return
  }
}

function completeAuth(token) {
  localStorage.setItem('auth_token_v1', token)
  authToken = token
  console.log('Authentication complete', getCurrentUser())

  resolveAuthPromise()
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
  console.log('Could not authenticate!')
  window.open('/auth', '_self')
}

function parseJwt(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
}
