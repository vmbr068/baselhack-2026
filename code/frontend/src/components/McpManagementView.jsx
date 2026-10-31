import React, { useRef, useState, useMemo } from 'react'
import {
  IconSearch,
  IconPlus,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconServers,
} from './Icons'

const PAGE_SIZE = 12

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
    if (parsed.protocol === 'file:') return { label: 'Local file', href: null }
    return { label: parsed.host, href: url }
  } catch {
    return { label: url, href: null }
  }
}

function formatDate(value, language = 'en') {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const locale = language === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function McpManagementView({
  servers = [],
  loading = false,
  error = null,
  onRetry,
  onSelectServer,
  onToggleServer,
  onNewMcp,
  onCopyEndpoint,
  copiedId,
  language = 'en',
  t,
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'disabled'
  const [page, setPage] = useState(1)
  const viewRef = useRef(null)

  // Filtered servers list sorted by createdAt descending
  const filteredServers = useMemo(() => {
    return servers
      .filter((server) => {
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
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  }, [servers, search, statusFilter])

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
              aria-label={t.searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {/* Filter Pills */}
          <div className="filter-pills">
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => changeFilter('all')}
            >
              {t.filterAll} ({servers.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => changeFilter('active')}
            >
              {t.filterActive} ({servers.filter((s) => s.enabled !== false).length})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'disabled' ? 'active' : ''}`}
              onClick={() => changeFilter('disabled')}
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
        {pageServers.map((server) => {
          const enabled = server.enabled !== false
          const site = siteLink(server.url)
          const created = formatDate(server.createdAt, language)
          const isLocal = site.href === null || site.href.includes('localhost') || site.href.includes('127.0.0.1')
          const activeRoutesCount = (server.tools || []).filter(
            (t) => t.enabled !== false
          ).length

          return (
            <div
              key={server.id}
              className={`mcp-card ${enabled ? '' : 'disabled'}`}
            >
              {/* Site Preview Mock-Browser on Top */}
              <WebsiteCardPreview
                server={server}
                hostname={site.label}
                isLocal={isLocal}
              />

              {/* Card Body */}
              <div className="mcp-card-body">
                <div className="mcp-card-title-row">
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

                  {/* Switch to enable/disable server */}
                  <label
                    className="custom-switch"
                    title={enabled ? t.statusDisabled : t.statusActive}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Toggle ${server.name}`}
                      checked={enabled}
                      onChange={(e) => onToggleServer(server, e.target.checked)}
                    />
                    <span className="custom-switch-slider" />
                  </label>
                </div>

                {/* Metadata Row */}
                <div className="mcp-card-meta">
                  <span className={`mcp-card-status ${enabled ? 'active' : ''}`}>
                    {enabled ? t.statusActive : t.statusDisabled}
                  </span>
                  <span>{t.routesMetric(activeRoutesCount)}</span>
                  {server.source && server.source !== 'Website' && (
                    <span className="source-tag">{server.source}</span>
                  )}
                  {created && <span className="mcp-card-date">{created}</span>}
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

        {/* Loading State */}
        {loading && servers.length === 0 && (
          <div className="mcp-empty-state" role="status">
            <div className="radar-spinner" />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.loadingServers}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mcp-load-error" role="alert">
            <span>{t.errorLoadingServers} {error}</span>
            <button type="button" className="suggestion-chip" onClick={onRetry}>
              {t.retry}
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredServers.length === 0 && (
          <div className="mcp-empty-state">
            <div className="empty-state-icon">
              <IconServers size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.emptyTitle}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360 }}>
              {servers.length === 0
                ? t.emptyNoServers
                : search
                ? t.emptySearch(search)
                : t.emptyTitle}
            </p>
            {servers.length === 0 && (
              <button
                type="button"
                className="pill-submit-btn"
                style={{ height: 40, fontSize: 13, width: 'auto', marginTop: 8 }}
                onClick={onNewMcp}
              >
                <IconPlus size={16} />
                <span>{t.connectFirstSite}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          <span className="pagination-range">
            {t.paginationRange(firstIndex + 1, firstIndex + pageServers.length, filteredServers.length)}
          </span>
          <div className="pagination-pages">
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              {t.paginationPrev}
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
              {t.paginationNext}
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}
