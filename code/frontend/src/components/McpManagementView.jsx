import React, { useState, useMemo } from 'react'
import {
  IconSearch,
  IconPlus,
  IconExternalLink,
  IconCopy,
  IconCheck,
  IconLightning,
  IconServers,
} from './Icons'

// Multi-tiered website preview component (Backend screenshot -> Thum.io CDN -> Microlink -> Rich Adobe fallback)
function WebsiteCardPreview({ server, hostname, isLocal }) {
  const [imageState, setImageState] = useState('loading') // 'loading' | 'loaded' | 'error'
  const [attempt, setAttempt] = useState(0)

  const previewCandidates = useMemo(() => {
    const urls = []

    // 1. Direct backend screenshot if generated
    if (server.screenshot_url) urls.push(server.screenshot_url)
    if (server.screenshotUrl && !urls.includes(server.screenshotUrl)) urls.push(server.screenshotUrl)
    if (server.scanSummary?.screenshotPath) {
      const p = server.scanSummary.screenshotPath.startsWith('/')
        ? server.scanSummary.screenshotPath
        : `/static/screenshots/${server.scanSummary.screenshotPath}`
      if (!urls.includes(p)) urls.push(p)
    }

    // 2. High-speed CDN website thumbnails for remote websites
    if (!isLocal && server.url && (server.url.startsWith('http://') || server.url.startsWith('https://'))) {
      urls.push(`https://image.thum.io/get/width/700/crop/450/noanimate/${encodeURIComponent(server.url)}`)
      urls.push(`https://api.microlink.io/?url=${encodeURIComponent(server.url)}&screenshot=true&meta=false&embed=screenshot.url`)
    }

    return urls
  }, [server.url, server.screenshot_url, server.screenshotUrl, server.scanSummary?.screenshotPath, isLocal])

  const currentSrc = previewCandidates[attempt] || null

  const handleImageError = () => {
    if (attempt + 1 < previewCandidates.length) {
      setAttempt((prev) => prev + 1)
    } else {
      setImageState('error')
    }
  }

  const handleImageLoad = () => {
    setImageState('loaded')
  }

  const faviconUrl = hostname
    ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
    : ''

  return (
    <div className="mcp-preview-box">
      <div className="preview-browser-bar">
        <div className="preview-browser-dots">
          <span className="preview-dot dot-red" />
          <span className="preview-dot dot-yellow" />
          <span className="preview-dot dot-green" />
        </div>
        <div className="preview-url-pill">
          <span className="preview-lock-icon">🔒</span>
          <span className="preview-url-tag">{hostname || server.name}</span>
        </div>
      </div>

      <div className="preview-viewport">
        {currentSrc && imageState !== 'error' && (
          <img
            src={currentSrc}
            alt={server.name}
            className={`preview-thumbnail-img ${imageState === 'loaded' ? 'visible' : 'hidden'}`}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}

        {currentSrc && imageState === 'loading' && (
          <div className="preview-skeleton-loader">
            <div className="skeleton-pulse" />
          </div>
        )}

        {(!currentSrc || imageState === 'error') && (
          <div className="preview-fallback-banner">
            <div className="preview-fallback-gradient" />
            <div className="preview-fallback-content">
              <div className="preview-site-icon">
                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt=""
                    style={{ width: 26, height: 26, borderRadius: 5 }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : null}
                <span className="preview-initials">{server.initials || 'MC'}</span>
              </div>
              <div className="preview-site-meta">
                <strong className="preview-meta-title">{server.name}</strong>
                <span className="preview-meta-url">{server.url}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function McpManagementView({
  servers,
  onSelectServer,
  onToggleServer,
  onNewMcp,
  onCopyEndpoint,
  copiedId,
  t,
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
          <span className="management-eyebrow">{t.managementEyebrow}</span>
          <h1 className="management-title">{t.managementTitle}</h1>
          <p className="management-subtitle">{t.managementSubtitle}</p>
        </div>

        <div className="management-controls">
          {/* Search bar */}
          <div className="mcp-search-wrapper">
            <IconSearch size={15} />
            <input
              type="text"
              className="mcp-search-input"
              placeholder={t.searchPlaceholder}
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
              {t.filterAll} ({servers.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              {t.filterActive} ({servers.filter((s) => s.enabled !== false).length})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'disabled' ? 'active' : ''}`}
              onClick={() => setStatusFilter('disabled')}
            >
              {t.filterDisabled} ({servers.filter((s) => s.enabled === false).length})
            </button>
          </div>

          {/* New MCP Button */}
          <button type="button" className="management-add-btn" onClick={onNewMcp}>
            <IconPlus size={16} />
            <span>{t.connectSiteBtn}</span>
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

          return (
            <div
              key={server.id}
              className={`mcp-card ${server.enabled === false ? 'disabled' : ''}`}
            >
              {/* Site Preview Thumbnail Header */}
              <WebsiteCardPreview
                server={server}
                hostname={hostname}
                isLocal={isLocal}
              />

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
                    title={server.enabled !== false ? t.statusDisabled : t.statusActive}
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
                    <span>{server.enabled !== false ? t.statusActive : t.statusDisabled}</span>
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
                      ? `🐙 ${t.sourceGithub}`
                      : server.source === 'WordPress'
                      ? `🌐 ${t.sourceWordpress}`
                      : `🔗 ${t.sourceWebsite}`}
                  </span>

                  <span className="routes-metric-badge">
                    <IconLightning size={13} />
                    <span>{t.routesMetric(activeRoutesCount)}</span>
                  </span>
                </div>

                {/* Card Actions Bottom */}
                <div className="mcp-card-actions">
                  <button
                    type="button"
                    className="btn-manage-routes"
                    onClick={() => onSelectServer(server)}
                  >
                    <span>{t.manageRoutes}</span>
                    <IconExternalLink size={13} />
                  </button>

                  <button
                    type="button"
                    className="btn-copy-endpoint"
                    onClick={() => onCopyEndpoint(server)}
                    title={t.copyEndpoint}
                    aria-label={t.copyEndpoint}
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
              {t.emptyTitle}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360 }}>
              {search
                ? t.emptySearch(search)
                : t.emptyNoServers}
            </p>
            <button
              type="button"
              className="pill-submit-btn"
              style={{ height: 40, fontSize: 13, marginTop: 8 }}
              onClick={onNewMcp}
            >
              <IconPlus size={16} />
              <span>{t.connectFirstSite}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
