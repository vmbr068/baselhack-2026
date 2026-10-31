import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Header from './components/Header'
import Rail from './components/Rail'
import ConnectView from './components/ConnectView'
import McpManagementView from './components/McpManagementView'
import DetailDrawer from './components/DetailDrawer'
import { IconCheck, IconClose } from './components/Icons'
import {
  listMcpServers,
  getMcpServer,
  setMcpServerEnabled,
  setMcpToolEnabled,
  generateMcp,
  generateMcpInteractive,
  enrichMcpWithGithub,
  enrichMcpWithWordpress,
  consumeOAuthTicket,
  getCurrentUser,
  getAuthToken,
  getMcpEndpoint,
} from './api'

function readSavedTheme() {
  try {
    return localStorage.getItem('adobe-theme')
  } catch {
    return null
  }
}

function normalizeServer(server) {
  const name = server.hotelName || server.hotel_name || server.name || server.targetUrl || 'Serveur MCP'
  const url = server.targetUrl || server.target_url || server.url || ''
  const source =
    server.codebaseEnrichment?.source === 'github'
      ? 'GitHub'
      : server.codebaseEnrichment?.source === 'wordpress'
      ? 'WordPress'
      : server.source || 'Website'
  const tools = (server.tools || []).map((tool) => ({
    ...tool,
    enabled: tool.enabled !== false,
  }))

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return {
    ...server,
    id: server.serverId || server.server_id || server.id,
    serverId: server.serverId || server.server_id || server.id,
    name,
    url,
    source,
    enabled: server.enabled !== false,
    routes: tools.length,
    initials: initials || 'MC',
    tools,
  }
}

export default function App() {
  const [page, setPage] = useState('home') // 'home' | 'servers'
  const [colorScheme, setColorScheme] = useState(() => {
    const saved = readSavedTheme()
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  const [servers, setServers] = useState([])
  const [selected, setSelected] = useState(null)
  const [stage, setStage] = useState('idle') // 'idle' | 'analyzing' | 'result'
  const [analyzedUrl, setAnalyzedUrl] = useState('')
  const [generated, setGenerated] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [serversLoading, setServersLoading] = useState(true)
  const [serversError, setServersError] = useState('')
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const [copiedId, setCopiedId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [notifications, setNotifications] = useState([])

  // Sync theme with localStorage and body background
  useLayoutEffect(() => {
    try {
      localStorage.setItem('adobe-theme', colorScheme)
    } catch {
      // Ignore storage errors in restricted contexts
    }
    document.documentElement.className = `theme-${colorScheme}`
    document.body.className = `theme-${colorScheme}`
  }, [colorScheme])

  // Load user if token exists
  useEffect(() => {
    if (getAuthToken()) {
      getCurrentUser()
        .then(({ user }) => setCurrentUser(user))
        .catch(() => setCurrentUser(null))
    }
  }, [])

  // Load servers from backend
  async function refreshServers() {
    try {
      const data = await listMcpServers()
      setServers((Array.isArray(data) ? data : []).map(normalizeServer))
      setServersError('')
    } catch (err) {
      setServersError(err.message)
    } finally {
      setServersLoading(false)
    }
  }

  useEffect(() => {
    refreshServers()

    // Handle OAuth redirect params
    const params = new URLSearchParams(window.location.hash.slice(1))
    const oauth = params.get('oauth')
    const serverId = params.get('server_id')
    const provider = params.get('provider')
    const ticket = params.get('ticket')

    if (oauth === 'error') {
      window.history.replaceState({}, '', window.location.pathname)
      showToast(`La connexion du compte ${provider} a échoué`, 'error')
    } else if (oauth && serverId && ticket) {
      window.history.replaceState({}, '', window.location.pathname)
      consumeOAuthTicket(provider, ticket, serverId)
        .then(() => {
          showToast(`Compte ${provider} connecté avec succès`)
          refreshServers()
        })
        .catch((err) => setError(err.message))
    }
  }, [])

  // Keyboard shortcut Cmd+K / Ctrl+K to create a new MCP
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        handleNewMcp()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Reload the list each time the user opens it
  useEffect(() => {
    if (page === 'servers') refreshServers()
  }, [page])

  const showToast = (message, kind = 'success') => {
    window.clearTimeout(toastTimer.current)
    setToast({ message, kind })
    toastTimer.current = window.setTimeout(() => setToast(null), kind === 'error' ? 6000 : 3000)
  }

  const handleNewMcp = () => {
    setPage('home')
    // A running analysis cannot be cancelled, so its progress stays on screen.
    setStage((current) => (current === 'analyzing' ? current : 'idle'))
    setError('')
    setSelected(null)
    window.setTimeout(() => {
      const input = document.getElementById('site-url-input')
      input?.focus()
    }, 50)
  }

  // Never reopens the drawer if it was closed while the request was running
  const applyServerUpdate = (updated) => {
    setServers((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    )
    setSelected((current) => (current?.id === updated.id ? updated : current))
  }

  // Analyze URL and build MCP
  const handleAnalyze = async (targetUrl, isInteractive = false) => {
    setAnalyzedUrl(targetUrl)
    setStage('analyzing')
    setBusy(true)
    setError('')

    try {
      const result = isInteractive
        ? await generateMcpInteractive(targetUrl)
        : await generateMcp(targetUrl)

      let detail = result
      try {
        detail = await getMcpServer(result.server_id || result.serverId)
      } catch {
        // detail fallback to result
      }

      const normalized = normalizeServer(detail)
      setGenerated(normalized)
      setServers((current) => [
        normalized,
        ...current.filter((item) => item.id !== normalized.id),
      ])
      setNotifications((prev) => [
        { title: `MCP créé pour ${normalized.name}`, time: 'À l’instant' },
        ...prev,
      ])
      setStage('result')
      showToast('Serveur MCP créé avec succès')
    } catch (err) {
      setError(err.message || "Erreur lors de l'analyse du site web.")
      setStage('idle')
    } finally {
      setBusy(false)
    }
  }

  // Codebase Enrichment (GitHub / WordPress)
  const handleEnrich = async (source, values) => {
    const serverId = generated?.serverId || generated?.id
    if (!serverId) return

    setBusy(true)
    setError('')
    try {
      if (source === 'github') {
        await enrichMcpWithGithub(serverId, values)
      } else {
        await enrichMcpWithWordpress(serverId, values.wpUrl)
      }
      const updated = normalizeServer(await getMcpServer(serverId))
      setGenerated(updated)
      setServers((current) =>
        current.map((s) => (s.id === serverId ? updated : s))
      )
      showToast(`MCP enrichi depuis ${source} !`)
    } catch (err) {
      setError(err.message || "Échec de l'enrichissement.")
    } finally {
      setBusy(false)
    }
  }

  // Toggle server active state
  const handleToggleServer = async (server, enabled) => {
    try {
      const updated = normalizeServer(
        await setMcpServerEnabled(server.id, enabled)
      )
      applyServerUpdate(updated)
      showToast(`Serveur ${enabled ? 'activé' : 'désactivé'}`)
    } catch (err) {
      showToast(err.message || 'Impossible de modifier ce serveur.', 'error')
    }
  }

  // Toggle tool active state
  const handleToggleTool = async (server, tool, enabled) => {
    try {
      applyServerUpdate(
        normalizeServer(await setMcpToolEnabled(server.id, tool.name, enabled))
      )
    } catch (err) {
      showToast(err.message || 'Impossible de modifier cette route.', 'error')
    }
  }

  // Copy MCP endpoint for Claude / agents
  const handleCopyEndpoint = async (server) => {
    try {
      await navigator.clipboard.writeText(getMcpEndpoint(server.id))
      setCopiedId(server.id)
      showToast(`Endpoint MCP copié pour ${server.name} !`)
      window.setTimeout(() => setCopiedId(null), 2000)
    } catch {
      showToast("Copie impossible : sélectionnez l'endpoint manuellement.", 'error')
    }
  }

  // Refresh server details
  const handleUpdateServer = async (server) => {
    try {
      applyServerUpdate(normalizeServer(await getMcpServer(server.id)))
      showToast('Serveur actualisé')
    } catch (err) {
      showToast(err.message || "Impossible d'actualiser ce serveur.", 'error')
    }
  }

  return (
    <div className={`adobe-app theme-${colorScheme}`}>
      {/* 1. TOP HEADER WITH ADOBE LOGO & ACTIONS */}
      <Header
        colorScheme={colorScheme}
        setColorScheme={setColorScheme}
        onNavigateHome={() => setPage('home')}
        notifications={notifications}
        currentUser={currentUser}
        onNavigate={setPage}
      />

      {/* 2. BODY: LEFT RAIL + GIANT FLOATING CARD CANVAS */}
      <div className="adobe-body">
        {/* Left Rail Sidebar */}
        <Rail
          activePage={page}
          setPage={setPage}
          onNewMcp={handleNewMcp}
        />

        {/* 3. The Giant Floating Card Container (Adobe Canvas) */}
        <main className="adobe-canvas">
          <div className="adobe-canvas-content">
            {page === 'home' && (
              <ConnectView
                onAnalyze={handleAnalyze}
                stage={stage}
                analyzedUrl={analyzedUrl}
                generated={generated}
                busy={busy}
                error={error}
                onReset={() => {
                  setStage('idle')
                  setAnalyzedUrl('')
                  setError('')
                }}
                onGoToManagement={() => setPage('servers')}
                onEnrich={handleEnrich}
              />
            )}

            {page === 'servers' && (
              <McpManagementView
                servers={servers}
                loading={serversLoading}
                error={serversError}
                onRetry={refreshServers}
                onSelectServer={setSelected}
                onToggleServer={handleToggleServer}
                onNewMcp={handleNewMcp}
                onCopyEndpoint={handleCopyEndpoint}
                copiedId={copiedId}
              />
            )}
          </div>
        </main>
      </div>

      {/* Detail Drawer (When clicking "Gérer les routes") */}
      {selected && (
        <DetailDrawer
          server={selected}
          onClose={() => setSelected(null)}
          onToggleServer={handleToggleServer}
          onToggleTool={handleToggleTool}
          onUpdateServer={handleUpdateServer}
          onCopyEndpoint={handleCopyEndpoint}
          copiedId={copiedId}
        />
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`adobe-toast ${toast.kind === 'error' ? 'error' : ''}`}
          role={toast.kind === 'error' ? 'alert' : 'status'}
        >
          {toast.kind === 'error' ? <IconClose size={16} /> : <IconCheck size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
