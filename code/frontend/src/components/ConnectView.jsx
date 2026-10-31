import React, { useState } from 'react'
import {
  IconPlus,
  IconCheck,
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
  t,
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
      {/* 1. IDLE STATE: EXACT FIGMA MOCKUP */}
      {stage === 'idle' && (
        <>
          <h1 className="connect-heading">{t.heading}</h1>
          <p className="connect-subheading">{t.subheading}</p>

          <form className="connect-form" onSubmit={handleSubmit}>
            <div className="pill-input-wrapper">
              <input
                id="site-url-input"
                type="url"
                className="pill-input"
                placeholder={t.placeholder}
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
              <span>{t.buildMcp}</span>
            </button>
          </form>

          {/* Quick Demo Suggestions */}
          <div className="connect-suggestions">
            <span>{t.suggestions}</span>
            <button
              type="button"
              className="suggestion-chip"
              onClick={() => handleSuggestion('https://hotel.bh2026.tekitup.net')}
            >
              {t.demoHotel}
            </button>
            <button
              type="button"
              className="suggestion-chip"
              onClick={() => handleSuggestion('http://localhost:3000')}
            >
              {t.demoLocal}
            </button>
          </div>

          {error && (
            <div className="connect-error-banner">
              {error}
            </div>
          )}
        </>
      )}

      {/* 2. ANALYZING STATE: SEAMLESS DIRECT IN CANVAS (NO NESTED CARD) */}
      {stage === 'analyzing' && (
        <div className="canvas-state-direct">
          <div className="radar-spinner" />
          <h2 className="connect-heading" style={{ fontSize: 26, marginTop: 12 }}>
            {t.analyzingTitle}
          </h2>
          <span className="analysis-target-url">{analyzedUrl}</span>

          <div className="seamless-steps-row">
            <span className="seamless-step done">
              <span className="step-num">✓</span> {t.step1}
            </span>
            <span className="step-separator">›</span>
            <span className="seamless-step active">
              <span className="step-num">2</span> {t.step2}
            </span>
            <span className="step-separator">›</span>
            <span className="seamless-step">
              <span className="step-num">3</span> {t.step3}
            </span>
          </div>
        </div>
      )}

      {/* 3. RESULT STATE: SEAMLESS DIRECT IN CANVAS (NO NESTED CARD) */}
      {stage === 'result' && (
        <div className="canvas-state-direct">
          <span className="success-badge">
            <IconCheck size={14} />
            {t.resultSuccess}
          </span>

          <h2 className="connect-heading" style={{ fontSize: 28, marginTop: 8 }}>
            {generated?.hotel_name || generated?.name || t.resultReady}
          </h2>
          <p className="connect-subheading" style={{ maxWidth: 540, marginBottom: 20 }}>
            {t.resultDesc(analyzedUrl)}
          </p>

          {/* Detected routes pills */}
          <div className="detected-routes-pills">
            {(generated?.tools || []).map((tool, idx) => (
              <span key={idx} className="detected-route-pill">
                <IconLightning size={13} />
                <code>{tool.name}</code>
              </span>
            ))}
          </div>

          {/* Codebase Enrichment Inline (Optional) */}
          {!showEnrichForm ? (
            <button
              type="button"
              className="enrich-text-btn"
              onClick={() => setShowEnrichForm(true)}
            >
              <span>+ {t.enrichPrompt}</span>
            </button>
          ) : (
            <form
              className="enrich-inline-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (repoUrl.trim()) {
                  onEnrich('github', { repoUrl: repoUrl.trim(), branch: branch.trim() })
                }
              }}
            >
              <div className="pill-input-wrapper" style={{ height: 40, width: 340 }}>
                <input
                  type="url"
                  className="pill-input"
                  placeholder={t.enrichRepoPlaceholder}
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="pill-submit-btn"
                style={{ height: 40, fontSize: 13 }}
                disabled={busy}
              >
                {busy ? t.enriching : t.enrichSubmit}
              </button>
              <button
                type="button"
                className="suggestion-chip"
                onClick={() => setShowEnrichForm(false)}
              >
                {t.cancel}
              </button>
            </form>
          )}

          {/* Action buttons */}
          <div className="result-actions-row">
            <button
              type="button"
              className="suggestion-chip"
              onClick={onReset}
              style={{ padding: '10px 18px', fontSize: 13 }}
            >
              {t.connectAnother}
            </button>
            <button
              type="button"
              className="pill-submit-btn"
              onClick={onGoToManagement}
            >
              <span>{t.goToManagement}</span>
              <IconExternalLink size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
