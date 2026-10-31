const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
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

function patchBody(value) {
  return { method: 'PATCH', body: JSON.stringify(value) }
}

export const listMcpServers = () => request('/servers')

export const getMcpServer = serverId =>
  request(`/servers/${encodeURIComponent(serverId)}`)

export const setMcpServerEnabled = (serverId, enabled) =>
  request(`/servers/${encodeURIComponent(serverId)}`, patchBody({ enabled }))

export const setMcpToolEnabled = (serverId, toolName, enabled) =>
  request(`/servers/${encodeURIComponent(serverId)}/tools/${encodeURIComponent(toolName)}`, patchBody({ enabled }))

export const consumeOAuthTicket = (provider, ticket, serverId) =>
  request(`/oauth/${provider}/consume`, jsonBody({ ticket, serverId }))

export const getProviderConnectUrl = (serverId, provider, siteUrl) => {
  const path = `/servers/${encodeURIComponent(serverId)}/connect/${provider}`
  return `${API_BASE_URL}${path}${provider === 'wordpress' ? `?site_url=${encodeURIComponent(siteUrl)}` : ''}`
}

export const generateMcp = url => request('/generate', jsonBody({ url }))

export const enrichMcpWithGithub = (serverId, { repoUrl, branch, githubToken }) =>
  request(`/servers/${encodeURIComponent(serverId)}/enrich/github`, jsonBody({
    repoUrl,
    ...(branch ? { branch } : {}),
    ...(githubToken ? { githubToken } : {}),
  }))

export const enrichMcpWithWordpress = (serverId, wpUrl, accessToken, wpSiteId) =>
  request(`/servers/${encodeURIComponent(serverId)}/enrich/wordpress`, jsonBody(
    { ...(wpUrl ? { wpUrl } : {}), ...(accessToken ? { accessToken } : {}), ...(wpSiteId ? { wpSiteId } : {}) },
  ))
