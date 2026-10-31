import React, { useRef, useState, useMemo } from 'react'
import {
  IconSearch,
  IconPlus,
  IconCopy,
  IconCheck,
  IconServers,
} from './Icons'

const PAGE_SIZE = 12

// Every page when there are few, otherwise the first, the last and the neighbours.
function visiblePages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1, current - 1, current, current + 1, total]
    .filter((page, i, all) => page >= 1 && page <= total && all.indexOf(page) === i)
    .sort((a, b) => a - b)
  return pages.flatMap((page, i) =>
    i > 0 && page - pages[i - 1] > 1 ? [`gap-${page}`, page] : [page]
  )
}

function siteLink(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'file:') return { label: 'Fichier local', href: null }
    return { label: parsed.host, href: url }
  } catch {
    return { label: url, href: null }
  }
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? dateFormat.format(date) : ''
}

export default function McpManagementView({
  servers,
  loading,
  error,
  onRetry,
  onSelectServer,
  onToggleServer,
  onNewMcp,
  onCopyEndpoint,
  copiedId,
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'disabled'
  const [page, setPage] = useState(1)
  const viewRef = useRef(null)

  // Filtered servers list
  const filteredServers = useMemo(() => {
    return servers.filter((server) => {
      const matchesSearch =
        (server.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (server.url || '').toLowerCase().includes(search.toLowerCase()) ||
        (server.source || '').toLowerCase().includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && server.enabled !== false) ||
        (statusFilter === 'disabled' && server.enabled === false)

      return matchesSearch && matchesStatus
    }).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  }, [servers, search, statusFilter])

  // The list can shrink under the current page, for example after a refresh.
  const totalPages = Math.max(1, Math.ceil(filteredServers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const firstIndex = (currentPage - 1) * PAGE_SIZE
  const pageServers = filteredServers.slice(firstIndex, firstIndex + PAGE_SIZE)

  const changeFilter = (nextFilter) => {
    setStatusFilter(nextFilter)
    setPage(1)
  }

  const goToPage = (nextPage) => {
    setPage(nextPage)
    viewRef.current?.closest('.adobe-canvas-content')?.scrollTo({ top: 0 })
  }

  return (
    <div className="mcp-management-view" ref={viewRef}>
      {/* Header */}
      <div className="management-header">
        <h1 className="management-title">Mes serveurs MCP</h1>
        <button type="button" className="management-add-btn" onClick={onNewMcp}>
          <IconPlus size={16} />
          <span>Connecter un site</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="management-controls">
        <div className="mcp-search-wrapper">
          <IconSearch size={15} />
          <input
            type="text"
            className="mcp-search-input"
            placeholder="Rechercher"
            aria-label="Rechercher un MCP"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="filter-pills">
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => changeFilter('all')}
          >
            Tous ({servers.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => changeFilter('active')}
          >
            Actifs ({servers.filter((s) => s.enabled !== false).length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'disabled' ? 'active' : ''}`}
            onClick={() => changeFilter('disabled')}
          >
            Désactivés ({servers.filter((s) => s.enabled === false).length})
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="mcp-cards-grid">
        {pageServers.map((server) => {
          const enabled = server.enabled !== false
          const site = siteLink(server.url)
          const created = formatDate(server.createdAt)
          const activeRoutesCount = (server.tools || []).filter(
            (t) => t.enabled !== false
          ).length

          return (
            <div key={server.id} className={`mcp-card ${enabled ? '' : 'disabled'}`}>
              <div className="mcp-card-title-row">
                <div className="mcp-card-icon">{server.initials || 'MC'}</div>
                <div className="mcp-card-name-group">
                  <span className="mcp-card-name" title={server.name}>
                    {server.name}
                  </span>
                  {site.href ? (
                    <a
                      href={site.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mcp-card-site"
                      title={server.url}
                    >
                      {site.label}
                    </a>
                  ) : (
                    <span className="mcp-card-site" title={server.url}>
                      {site.label}
                    </span>
                  )}
                </div>
                <label
                  className="custom-switch"
                  title={enabled ? 'Désactiver le MCP' : 'Activer le MCP'}
                >
                  <input
                    type="checkbox"
                    aria-label={`Activer ${server.name}`}
                    checked={enabled}
                    onChange={(e) => onToggleServer(server, e.target.checked)}
                  />
                  <span className="custom-switch-slider" />
                </label>
              </div>

              <div className="mcp-card-meta">
                <span className={`mcp-card-status ${enabled ? 'active' : ''}`}>
                  {enabled ? 'Actif' : 'Désactivé'}
                </span>
                <span>
                  {activeRoutesCount} {activeRoutesCount > 1 ? 'routes' : 'route'}
                </span>
                {server.source !== 'Website' && <span>{server.source}</span>}
                {created && <span>{created}</span>}
              </div>

              <div className="mcp-card-actions">
                <button
                  type="button"
                  className="btn-manage-routes"
                  onClick={() => onSelectServer(server)}
                >
                  Gérer les routes
                </button>
                <button
                  type="button"
                  className="btn-copy-endpoint"
                  onClick={() => onCopyEndpoint(server)}
                  title="Copier le endpoint MCP pour Claude / agents IA"
                  aria-label="Copier le endpoint MCP"
                >
                  {copiedId === server.id ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </button>
              </div>
            </div>
          )
        })}

        {/* Empty State */}
        {loading && servers.length === 0 && (
          <div className="mcp-empty-state" role="status">
            <div className="radar-spinner" />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Chargement des serveurs…</p>
          </div>
        )}

        {error && (
          <div className="mcp-load-error" role="alert">
            <span>Impossible de charger les serveurs : {error}</span>
            <button type="button" className="suggestion-chip" onClick={onRetry}>
              Réessayer
            </button>
          </div>
        )}

        {!loading && !error && filteredServers.length === 0 && (
          <div className="mcp-empty-state">
            <div className="empty-state-icon">
              <IconServers size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              Aucun serveur MCP trouvé
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360 }}>
              {servers.length === 0
                ? 'Vous n’avez pas encore connecté de site web. Commencez par en analyser un !'
                : search
                ? `Aucun résultat ne correspond à votre recherche "${search}".`
                : 'Aucun serveur ne correspond à ce filtre.'}
            </p>
            {servers.length === 0 && (
              <button
                type="button"
                className="pill-submit-btn"
                style={{ height: 40, fontSize: 13, width: 'auto' }}
                onClick={onNewMcp}
              >
                <IconPlus size={16} />
                <span>Connecter un premier site</span>
              </button>
            )}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Pagination des serveurs MCP">
          <span className="pagination-range">
            {firstIndex + 1}–{firstIndex + pageServers.length} sur {filteredServers.length}
          </span>
          <div className="pagination-pages">
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              Précédent
            </button>
            {visiblePages(currentPage, totalPages).map((item) =>
              typeof item === 'number' ? (
                <button
                  key={item}
                  type="button"
                  className={`pagination-btn ${item === currentPage ? 'active' : ''}`}
                  aria-label={`Page ${item}`}
                  aria-current={item === currentPage ? 'page' : undefined}
                  onClick={() => goToPage(item)}
                >
                  {item}
                </button>
              ) : (
                <span key={item} className="pagination-gap">…</span>
              )
            )}
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Suivant
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}
