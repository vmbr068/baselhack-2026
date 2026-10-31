import React, { useEffect, useRef, useState } from 'react'
import { getMcpEndpoint } from '../api'
import {
  IconClose,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconShield,
  IconRefresh,
  IconLightning,
} from './Icons'

export default function DetailDrawer({
  server,
  onClose,
  onToggleServer,
  onToggleTool,
  onUpdateServer,
  onCopyEndpoint,
  copiedId,
  t,
}) {
  const [busyTool, setBusyTool] = useState(null)
  const [busyServer, setBusyServer] = useState(false)
  const closeButton = useRef(null)
  const latestOnClose = useRef(onClose)
  latestOnClose.current = onClose

  // Runs once per opening, so that re-renders do not steal the focus.
  useEffect(() => {
    const previousFocus = document.activeElement
    closeButton.current?.focus()
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') latestOnClose.current()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [])

  if (!server) return null

  // MCP endpoint URL to give to Claude or agents
  const endpointUrl = getMcpEndpoint(server.id)

  const tools = server.tools || []
  const activeToolsCount = tools.filter((t) => t.enabled !== false).length

  const handleToolToggle = async (tool, nextVal) => {
    setBusyTool(tool.name)
    try {
      await onToggleTool(server, tool, nextVal)
    } finally {
      setBusyTool(null)
    }
  }

  const handleServerToggle = async (nextVal) => {
    setBusyServer(true)
    try {
      await onToggleServer(server, nextVal)
    } finally {
      setBusyServer(false)
    }
  }

  return (
    <div
      className="drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label={server.name}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-header-left">
            <span className="drawer-eyebrow">{t.drawerEyebrow}</span>
            <h2 className="drawer-title">{server.name}</h2>
          </div>
          <button
            ref={closeButton}
            type="button"
            className="header-icon-btn"
            onClick={onClose}
            aria-label={t.cancel || 'Close'}
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="drawer-content">
          {/* Endpoint Card for AI Agents */}
          <div className="server-endpoint-card">
            <span className="server-endpoint-label">
              {t.drawerEndpointLabel}
            </span>
            <div className="server-endpoint-row">
              <span className="server-endpoint-code" title={endpointUrl}>{endpointUrl}</span>
              <button
                type="button"
                className="btn-inline-copy"
                onClick={() => onCopyEndpoint(server)}
              >
                {copiedId === server.id ? (
                  <>
                    <IconCheck size={14} />
                    <span>{t.drawerCopied}</span>
                  </>
                ) : (
                  <>
                    <IconCopy size={14} />
                    <span>{t.drawerCopy}</span>
                  </>
                )}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {t.drawerGlobalState}
              </span>
              <label className="custom-switch">
                <input
                  type="checkbox"
                  aria-label="Activer le serveur MCP"
                  checked={server.enabled !== false}
                  disabled={busyServer}
                  onChange={(e) => handleServerToggle(e.target.checked)}
                />
                <span className="custom-switch-slider" />
              </label>
            </div>
          </div>

          {/* Safety Guardrail Alert (AGENTS.md Requirement) */}
          <div className="guardrail-card">
            <IconShield size={18} />
            <div>
              <strong>{t.guardrailTitle}</strong>
              <p style={{ marginTop: 2 }}>
                {t.guardrailText}
              </p>
            </div>
          </div>

          {/* Tools / Routes List */}
          <div>
            <div className="routes-section-title">
              <span>{t.drawerRoutesTitle}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {t.drawerRoutesRatio(activeToolsCount, tools.length)}
              </span>
            </div>

            <div style={{ marginTop: 10 }}>
              {tools.map((tool) => {
                const isEnabled = tool.enabled !== false
                const method = tool.apiMethod || (tool.executionMode === 'api' ? 'POST' : 'MCP')

                return (
                  <div key={tool.name} className="route-item-card">
                    <div className="route-item-left">
                      <span
                        className={`route-method-badge ${
                          method.toLowerCase() === 'post' ? 'post' : ''
                        }`}
                      >
                        {method}
                      </span>
                      <div className="route-info-group">
                        <span className="route-name">{tool.name}</span>
                        <span className="route-desc">{tool.description}</span>
                      </div>
                    </div>

                    <label className="custom-switch">
                      <input
                        type="checkbox"
                        aria-label={`Activer la route ${tool.name}`}
                        checked={isEnabled}
                        disabled={busyTool === tool.name}
                        onChange={(e) => handleToolToggle(tool, e.target.checked)}
                      />
                      <span className="custom-switch-slider" />
                    </label>
                  </div>
                )
              })}

              {tools.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>
                  {t.drawerNoRoutes}
                </p>
              )}
            </div>
          </div>

          {/* Source & Codebase Enrichment Info */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              {t.drawerSourceTitle}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t.drawerCurrentSource} <strong>{!server.source || server.source === 'Website' ? 'Website' : server.source}</strong>
              {server.codebaseEnrichment ? (
                <div style={{ marginTop: 4, color: 'var(--green)' }}>
                  ✓ {t.drawerEnrichedBadge} {server.codebaseEnrichment.source}
                </div>
              ) : (
                <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                  {t.drawerDomBadge}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer">
          <button
            type="button"
            className="suggestion-chip"
            onClick={() => onUpdateServer(server)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconRefresh size={14} />
            <span>{t.drawerRefresh}</span>
          </button>

          <button
            type="button"
            className="pill-submit-btn"
            style={{ height: 36, fontSize: 12, width: 'auto' }}
            onClick={onClose}
          >
            {t.drawerDone}
          </button>
        </div>
      </aside>
    </div>
  )
}
