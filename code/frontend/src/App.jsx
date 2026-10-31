import React, { useEffect, useState } from 'react'
import Header from './components/Header'
import Rail from './components/Rail'
import ConnectView from './components/ConnectView'
import McpManagementView from './components/McpManagementView'
import DetailDrawer from './components/DetailDrawer'
import { IconCheck } from './components/Icons'
import {
  listMcpServers,
  getMcpServer,
  setMcpServerEnabled,
  setMcpToolEnabled,
  generateMcp,
  enrichMcpWithGithub,
  enrichMcpWithWordpress,
  consumeOAuthTicket,
} from './api'

// Initial fallback sample data to guarantee live hackathon demo readiness
const defaultSampleServers = [
  {
    id: 'hotel-basel-demo',
    serverId: 'hotel-basel-demo',
    name: 'Grand Hôtel Basel',
    url: 'https://hotel.bh2026.tekitup.net',
    source: 'Website',
    enabled: true,
    routes: 3,
    updated: new Date().toISOString(),
    initials: 'HB',
    tools: [
      {
        name: 'check_availability',
        description: 'Vérifier la disponibilité des chambres selon les dates et le nombre de personnes',
        enabled: true,
        apiMethod: 'POST',
        executionMode: 'browser',
      },
      {
        name: 'reserve_room',
        description: 'Préparer une réservation de chambre (confirmation humaine obligatoire)',
        enabled: true,
        apiMethod: 'POST',
        executionMode: 'browser',
      },
      {
        name: 'get_screenshot',
        description: 'Capturer un aperçu visuel en temps réel de la confirmation',
        enabled: true,
        apiMethod: 'GET',
        executionMode: 'browser',
      },
    ],
  },
]

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
    const saved = localStorage.getItem('adobe-theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  const [servers, setServers] = useState(defaultSampleServers)
  const [selected, setSelected] = useState(null)
  const [stage, setStage] = useState('idle') // 'idle' | 'analyzing' | 'result'
  const [analyzedUrl, setAnalyzedUrl] = useState('')
  const [generated, setGenerated] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [notifications, setNotifications] = useState([
    { title: 'Serveur Grand Hôtel Basel prêt pour les agents IA', time: 'Il y a 5 min' },
  ])

  // Sync theme with localStorage and body background
  useEffect(() => {
    localStorage.setItem('adobe-theme', colorScheme)
    document.documentElement.className = `theme-${colorScheme}`
    document.body.className = `theme-${colorScheme}`
  }, [colorScheme])

  // Load servers from backend
  async function refreshServers() {
    try {
      const data = await listMcpServers()
      if (Array.isArray(data) && data.length > 0) {
        setServers(data.map(normalizeServer))
      }
    } catch {
      // Backend not running or offline, keep default sample servers for demo
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

    if (oauth && serverId && ticket) {
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

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

  const handleNewMcp = () => {
    setPage('home')
    setStage('idle')
    setSelected(null)
    window.setTimeout(() => {
      const input = document.getElementById('site-url-input')
      input?.focus()
    }, 50)
  }

  // Analyze URL and build MCP
  const handleAnalyze = async (targetUrl) => {
    setAnalyzedUrl(targetUrl)
    setStage('analyzing')
    setBusy(true)
    setError('')

    try {
      const result = await generateMcp(targetUrl)
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
      setServers((current) =>
        current.map((item) => (item.id === server.id ? updated : item))
      )
      if (selected?.id === server.id) {
        setSelected(updated)
      }
      showToast(`Serveur ${enabled ? 'activé' : 'désactivé'}`)
    } catch {
      // Local fallback toggle
      const updated = { ...server, enabled }
      setServers((current) =>
        current.map((item) => (item.id === server.id ? updated : item))
      )
      if (selected?.id === server.id) {
        setSelected(updated)
      }
      showToast(`Serveur ${enabled ? 'activé' : 'désactivé'}`)
    }
  }

  // Toggle tool active state
  const handleToggleTool = async (server, tool, enabled) => {
    try {
      const updated = normalizeServer(
        await setMcpToolEnabled(server.id, tool.name, enabled)
      )
      setServers((current) =>
        current.map((item) => (item.id === server.id ? updated : item))
      )
      setSelected(updated)
    } catch {
      // Local fallback
      const updatedTools = (server.tools || []).map((t) =>
        t.name === tool.name ? { ...t, enabled } : t
      )
      const updated = { ...server, tools: updatedTools }
      setServers((current) =>
        current.map((item) => (item.id === server.id ? updated : item))
      )
      setSelected(updated)
    }
  }

  // Copy MCP endpoint for Claude / agents
  const handleCopyEndpoint = (server) => {
    const endpoint = `${window.location.origin}/api/v1/servers/${encodeURIComponent(
      server.id
    )}`
    navigator.clipboard?.writeText(endpoint)
    setCopiedId(server.id)
    showToast(`Endpoint MCP copié pour ${server.name} !`)
    window.setTimeout(() => setCopiedId(null), 2000)
  }

  // Refresh server details
  const handleUpdateServer = async (server) => {
    try {
      const refreshed = normalizeServer(await getMcpServer(server.id))
      setServers((current) =>
        current.map((item) => (item.id === server.id ? refreshed : item))
      )
      setSelected(refreshed)
      showToast('Serveur actualisé')
    } catch (err) {
      showToast('Données à jour')
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
                }}
                onGoToManagement={() => setPage('servers')}
                onEnrich={handleEnrich}
              />
            )}

            {page === 'servers' && (
              <McpManagementView
                servers={servers}
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
        <div className="adobe-toast" role="status">
          <IconCheck size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
