import React, { useState, useMemo } from 'react'
import {
  IconSearch,
  IconPlus,
  IconExternalLink,
  IconCopy,
  IconCheck,
  IconLightning,
  IconGlobe,
  IconServers,
} from './Icons'

export default function McpManagementView({
  servers,
  onSelectServer,
  onToggleServer,
  onNewMcp,
  onCopyEndpoint,
  copiedId,
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'disabled'

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
    })
  }, [servers, search, statusFilter])

  return (
    <div className="mcp-management-view">
      {/* Header Toolbar */}
      <div className="management-header">
        <div className="management-title-group">
          <span className="management-eyebrow">Connecteurs IA</span>
          <h1 className="management-title">Mes serveurs MCP</h1>
          <p className="management-subtitle">
            Gérez vos sites connectés, activez leurs routes et exposez-les aux agents (Claude, Cursor, etc.).
          </p>
        </div>

        <div className="management-controls">
          {/* Search bar */}
          <div className="mcp-search-wrapper">
            <IconSearch size={15} />
            <input
              type="text"
              className="mcp-search-input"
              placeholder="Rechercher un MCP…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter Pills */}
          <div className="filter-pills">
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Tous ({servers.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Actifs ({servers.filter((s) => s.enabled !== false).length})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'disabled' ? 'active' : ''}`}
              onClick={() => setStatusFilter('disabled')}
            >
              Désactivés ({servers.filter((s) => s.enabled === false).length})
            </button>
          </div>

          {/* New MCP Button */}
          <button type="button" className="management-add-btn" onClick={onNewMcp}>
            <IconPlus size={16} />
            <span>Connecter un site</span>
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="mcp-cards-grid">
        {filteredServers.map((server) => {
          let hostname = ''
          let isLocal = false
          try {
            const parsed = new URL(server.url)
            hostname = parsed.hostname
            isLocal = ['localhost', '127.0.0.1'].includes(hostname)
          } catch {
            hostname = server.url
          }

          const activeRoutesCount = (server.tools || []).filter(
            (t) => t.enabled !== false
          ).length

          const faviconUrl = hostname
            ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
            : ''
          const screenshot =
            server.screenshot_url ||
            server.screenshotUrl ||
            server.scanSummary?.screenshotPath

          return (
            <div
              key={server.id}
              className={`mcp-card ${server.enabled === false ? 'disabled' : ''}`}
            >
              {/* Site Preview Thumbnail Header */}
              <div className="mcp-preview-box">
                <div className="preview-browser-bar">
                  <span className="preview-dot" />
                  <span className="preview-dot" />
                  <span className="preview-dot" />
                  <span className="preview-url-tag">{hostname || server.name}</span>
                </div>

                <div className="preview-iframe-wrapper">
                  {screenshot ? (
                    <img
                      src={screenshot}
                      alt={server.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="preview-fallback-banner">
                      <div className="preview-site-icon">
                        {faviconUrl ? (
                          <img
                            src={faviconUrl}
                            alt=""
                            style={{ width: 26, height: 26, borderRadius: 4 }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : null}
                        <span>{server.initials || 'MC'}</span>
                      </div>
                      <div className="preview-site-meta">
                        <strong>{server.name}</strong>
                        <span>{server.url}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="mcp-card-body">
                <div className="mcp-card-title-row">
                  <div className="mcp-card-name-group">
                    <span className="mcp-card-name" title={server.name}>
                      {server.name}
                    </span>
                    <a
                      href={server.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mcp-card-url-link"
                    >
                      <span>{hostname || server.url}</span>
                      <IconExternalLink size={12} />
                    </a>
                  </div>

                  {/* Switch to enable/disable server */}
                  <label
                    className="custom-switch"
                    title={server.enabled !== false ? 'Désactiver le MCP' : 'Activer le MCP'}
                  >
                    <input
                      type="checkbox"
                      checked={server.enabled !== false}
                      onChange={(e) => onToggleServer(server, e.target.checked)}
                    />
                    <span className="custom-switch-slider" />
                  </label>
                </div>

                {/* Badges Row */}
                <div className="mcp-card-tags-row">
                  <span
                    className={`status-indicator-badge ${
                      server.enabled !== false ? 'active' : 'disabled'
                    }`}
                  >
                    <span className="status-dot-pulse" />
                    <span>{server.enabled !== false ? 'Actif' : 'Désactivé'}</span>
                  </span>

                  <span
                    className={`source-badge ${
                      server.source === 'GitHub'
                        ? 'github'
                        : server.source === 'WordPress'
                        ? 'wordpress'
                        : ''
                    }`}
                  >
                    {server.source === 'GitHub'
                      ? '🐙 GitHub'
                      : server.source === 'WordPress'
                      ? '🌐 WordPress'
                      : '🔗 Site Web'}
                  </span>

                  <span className="routes-metric-badge">
                    <IconLightning size={13} />
                    <span>{activeRoutesCount} routes</span>
                  </span>
                </div>

                {/* Card Actions Bottom */}
                <div className="mcp-card-actions">
                  <button
                    type="button"
                    className="btn-manage-routes"
                    onClick={() => onSelectServer(server)}
                  >
                    <span>Gérer les routes</span>
                    <IconExternalLink size={13} />
                  </button>

                  <button
                    type="button"
                    className="btn-copy-endpoint"
                    onClick={() => onCopyEndpoint(server)}
                    title="Copier le endpoint MCP pour Claude / agents IA"
                    aria-label="Copier le endpoint MCP"
                  >
                    {copiedId === server.id ? (
                      <IconCheck size={16} />
                    ) : (
                      <IconCopy size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Empty State */}
        {filteredServers.length === 0 && (
          <div className="mcp-empty-state">
            <div className="empty-state-icon">
              <IconServers size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              Aucun serveur MCP trouvé
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360 }}>
              {search
                ? `Aucun résultat ne correspond à votre recherche "${search}".`
                : 'Vous n’avez pas encore connecté de site web. Commencez par en analyser un !'}
            </p>
            <button
              type="button"
              className="pill-submit-btn"
              style={{ height: 40, fontSize: 13, marginTop: 8 }}
              onClick={onNewMcp}
            >
              <IconPlus size={16} />
              <span>Connecter un premier site</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
