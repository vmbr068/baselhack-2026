const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

const TOKEN_KEY = 'mcpex_business_token'

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

async function request(path, options = {}) {
  let response
  const token = getAuthToken()
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Unable to reach the MCPEX backend. Check that it is running and try again.')
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message || payload?.error
    throw new Error(message || `The backend returned HTTP ${response.status}.`)
  }
  return payload
}

function jsonBody(value) {
  return { method: 'POST', body: JSON.stringify(value) }
}

// Business Owner Authentication
export const loginBusinessOwner = (email, password) =>
  request('/auth/login', jsonBody({ email, password }))

export const registerBusinessOwner = data =>
  request('/auth/register', jsonBody(data))

export const getCurrentUser = () =>
  request('/auth/me')

export const logoutBusinessOwner = () =>
  request('/auth/logout', { method: 'POST' })

export const getDemoAccounts = () =>
  request('/auth/demo-accounts')

// MCP Creator
export const listMcpServers = () => request('/servers')

export const getMcpServer = serverId =>
  request(`/servers/${encodeURIComponent(serverId)}`)

export const generateMcp = (url, authSession) =>
  request('/generate', jsonBody({ url, ...(authSession ? { auth_session: authSession } : {}) }))

export const generateMcpInteractive = (url, timeoutMs) =>
  request('/generate/interactive', jsonBody({ url, ...(timeoutMs ? { timeoutMs } : {}) }))

export const enrichMcpWithGithub = (serverId, { repoUrl, branch, githubToken }) =>
  request(`/servers/${encodeURIComponent(serverId)}/enrich/github`, jsonBody({
    repoUrl,
    ...(branch ? { branch } : {}),
    ...(githubToken ? { githubToken } : {}),
  }))

export const enrichMcpWithWordpress = (serverId, wpUrl) =>
  request(`/servers/${encodeURIComponent(serverId)}/enrich/wordpress`, jsonBody(
    wpUrl ? { wpUrl } : {},
  ))
