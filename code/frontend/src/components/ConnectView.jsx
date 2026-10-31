import React, { useState } from 'react'
import {
  IconPlus,
  IconCheck,
  IconGlobe,
  IconLightning,
  IconExternalLink,
} from './Icons'

export default function ConnectView({
  onAnalyze,
  stage,
  analyzedUrl,
  generated,
  busy,
  error,
  onReset,
  onGoToManagement,
  onEnrich,
}) {
  const [url, setUrl] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [showEnrichForm, setShowEnrichForm] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!url.trim()) return
    onAnalyze(url.trim())
  }

  const handleSuggestion = (suggestedUrl) => {
    setUrl(suggestedUrl)
  }

  return (
    <div className="connect-view">
      {/* 1. IDLE STATE: EXACT MATCH FIGMA */}
      {stage === 'idle' && (
        <>
          <h1 className="connect-heading">Que souhaitez-vous connecter ?</h1>
          <p className="connect-subheading">
            Votre passerelle de votre site vers les agents IA
          </p>

          <form className="connect-form" onSubmit={handleSubmit}>
            <div className="pill-input-wrapper">
              <input
                id="site-url-input"
                type="url"
                className="pill-input"
                placeholder="https://votre-site.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="pill-submit-btn"
              disabled={busy || !url.trim()}
            >
              <IconPlus size={18} />
              <span>Construire le MCP</span>
            </button>
          </form>

          {/* Quick Demo Suggestions */}
          <div className="connect-suggestions">
            <span>Suggestions rapides :</span>
            <button
              type="button"
              className="suggestion-chip"
              onClick={() => handleSuggestion('https://hotel.bh2026.tekitup.net')}
            >
              Grand Hôtel Basel (Démo)
            </button>
            <button
              type="button"
              className="suggestion-chip"
              onClick={() => handleSuggestion('http://localhost:3000')}
            >
              Hôtel Local (:3000)
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: 24,
                padding: '12px 20px',
                borderRadius: 'var(--radius-pill)',
                background: 'rgba(235, 16, 0, 0.12)',
                color: 'var(--accent-red)',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}
        </>
      )}

      {/* 2. ANALYZING / LOADING STATE */}
      {stage === 'analyzing' && (
        <div className="analysis-progress-card">
          <div className="radar-spinner" />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            Analyse et construction du MCP en cours
          </h2>
          <span className="analysis-target-url">{analyzedUrl}</span>

          <div className="analysis-steps">
            <div className="analysis-step-item done">
              <span className="step-indicator">✓</span>
              <span>1. Connexion au site web & capture DOM</span>
            </div>
            <div className="analysis-step-item active">
              <span className="step-indicator">2</span>
              <span>2. Détection des formulaires, chambres & actions</span>
            </div>
            <div className="analysis-step-item">
              <span className="step-indicator">3</span>
              <span>3. Génération des outils MCP & schéma JSON</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. GENERATION RESULT STATE */}
      {stage === 'result' && (
        <div className="generated-success-view">
          <div className="success-badge-row">
            <span className="success-badge">
              <IconCheck size={14} />
              MCP généré avec succès
            </span>
          </div>

          <h2 className="success-title">
            {generated?.hotel_name || generated?.name || 'Votre serveur MCP est prêt'}
          </h2>
          <p className="success-subtitle">
            Le connecteur MCP de base a été synthétisé à partir de{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{analyzedUrl}</strong>. Les agents IA peuvent désormais interagir avec ce site en toute sécurité.
          </p>

          {/* Routes Detected */}
          <div className="routes-detected-box">
            <div className="routes-detected-header">
              <span>Outils et routes IA détectés</span>
              <span style={{ color: 'var(--accent-red)' }}>
                {generated?.tools?.length || 0} routes actives
              </span>
            </div>
            {(generated?.tools || []).map((tool, idx) => (
              <div key={idx} className="route-detected-tag">
                <IconLightning size={14} />
                <code>{tool.name}</code>
                <span style={{ color: 'var(--text-secondary)' }}>— {tool.description}</span>
              </div>
            ))}
          </div>

          {/* Deep Codebase Enrichment */}
          <div className="enrichment-section">
            <div className="enrichment-title">
              Enrichir les outils avec le code source (facultatif)
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Connectez le dépôt GitHub de votre site pour extraire les routes API internes et éliminer toute friction.
            </p>

            {!showEnrichForm ? (
              <div className="enrichment-buttons-row">
                <button
                  type="button"
                  className="enrichment-btn"
                  onClick={() => setShowEnrichForm(true)}
                >
                  <span style={{ fontSize: 16 }}>🐙</span>
                  <span>Connecter un dépôt GitHub</span>
                </button>
              </div>
            ) : (
              <form
                style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}
                onSubmit={(e) => {
                  e.preventDefault()
                  if (repoUrl.trim()) {
                    onEnrich('github', { repoUrl: repoUrl.trim(), branch: branch.trim() })
                  }
                }}
              >
                <div className="pill-input-wrapper" style={{ height: 42, maxWidth: '100%' }}>
                  <input
                    type="url"
                    className="pill-input"
                    placeholder="https://github.com/mon-organisation/mon-site"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    className="pill-submit-btn"
                    style={{ height: 38, fontSize: 13 }}
                    disabled={busy}
                  >
                    {busy ? 'Enrichissement…' : 'Valider l’enrichissement'}
                  </button>
                  <button
                    type="button"
                    className="suggestion-chip"
                    onClick={() => setShowEnrichForm(false)}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Actions */}
          <div className="success-actions-row">
            <button
              type="button"
              className="suggestion-chip"
              onClick={onReset}
              style={{ padding: '8px 16px' }}
            >
              Connecter un autre site
            </button>
            <button
              type="button"
              className="pill-submit-btn"
              style={{ height: 40, fontSize: 13 }}
              onClick={onGoToManagement}
            >
              <span>Accéder aux serveurs MCP</span>
              <IconExternalLink size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
