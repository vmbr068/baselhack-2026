import React, { useState } from 'react'
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
}) {
  const [busyTool, setBusyTool] = useState(null)

  if (!server) return null

  // MCP endpoint URL to give to Claude or agents
  const endpointUrl = `${window.location.origin}/api/v1/servers/${encodeURIComponent(
    server.id
  )}`

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

  return (
    <div
      className="drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside className="drawer-panel" role="dialog" aria-label={server.name}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-header-left">
            <span className="drawer-eyebrow">Connecteur MCP</span>
            <h2 className="drawer-title">{server.name}</h2>
          </div>
          <button
            type="button"
            className="header-icon-btn"
            onClick={onClose}
            aria-label="Fermer"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="drawer-content">
          {/* Endpoint Card for AI Agents */}
          <div className="server-endpoint-card">
            <span className="server-endpoint-label">
              Endpoint MCP (pour Claude Desktop, Cursor & Agents IA)
            </span>
            <div className="server-endpoint-row">
              <span className="server-endpoint-code">{endpointUrl}</span>
              <button
                type="button"
                className="btn-inline-copy"
                onClick={() => onCopyEndpoint(server)}
              >
                {copiedId === server.id ? (
                  <>
                    <IconCheck size={14} />
                    <span>Copié</span>
                  </>
                ) : (
                  <>
                    <IconCopy size={14} />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                État global du serveur MCP :
              </span>
              <label className="custom-switch">
                <input
                  type="checkbox"
                  checked={server.enabled !== false}
                  onChange={(e) => onToggleServer(server, e.target.checked)}
                />
                <span className="custom-switch-slider" />
              </label>
            </div>
          </div>

          {/* Safety Guardrail Alert (AGENTS.md Requirement) */}
          <div className="guardrail-card">
            <IconShield size={18} />
            <div>
              <strong>Sécurité & Contrôle Humain :</strong>
              <p style={{ marginTop: 2 }}>
                Toute action irréversible (telle qu'une réservation effective ou un paiement) exige une confirmation explicite de l'utilisateur avant validation.
              </p>
            </div>
          </div>

          {/* Tools / Routes List */}
          <div>
            <div className="routes-section-title">
              <span>Routes exposées aux agents</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {activeToolsCount} / {tools.length} actives
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
                  Aucune route configurée pour ce serveur.
                </p>
              )}
            </div>
          </div>

          {/* Source & Codebase Enrichment Info */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              Source d'analyse & enrichissement
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Source actuelle : <strong>{server.source || 'Site Web'}</strong>
              {server.codebaseEnrichment ? (
                <div style={{ marginTop: 4, color: 'var(--green)' }}>
                  ✓ Codebase enrichie depuis {server.codebaseEnrichment.source}
                </div>
              ) : (
                <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                  Généré à partir de l'analyse DOM directe du site.
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
            <span>Actualiser le serveur</span>
          </button>

          <button
            type="button"
            className="pill-submit-btn"
            style={{ height: 36, fontSize: 12 }}
            onClick={onClose}
          >
            Terminé
          </button>
        </div>
      </aside>
    </div>
  )
}
