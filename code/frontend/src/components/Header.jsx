import React, { useState } from 'react'
import {
  AdobeLogo,
  IconHelp,
  IconBell,
  IconGrid,
  IconUser,
  IconMoon,
  IconSun,
  IconClose,
  IconExternalLink,
} from './Icons'

export default function Header({
  colorScheme,
  setColorScheme,
  onNavigateHome,
  notifications = [],
  t,
}) {
  const [showHelp, setShowHelp] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showApps, setShowApps] = useState(false)

  const toggleTheme = () => {
    setColorScheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <header className="adobe-header">
      <div className="adobe-header-left">
        <button
          className="adobe-logo-btn"
          onClick={onNavigateHome}
          title="Adobe - Accueil"
          aria-label="Adobe"
        >
          <AdobeLogo width={96} height={24} />
        </button>
      </div>

      <div className="adobe-header-right">
        {/* Theme Switcher */}
        <button
          className="header-icon-btn"
          onClick={toggleTheme}
          title={colorScheme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          aria-label="Changer le thème"
        >
          {colorScheme === 'dark' ? <IconSun size={19} /> : <IconMoon size={19} />}
        </button>

        {/* Help Button */}
        <button
          className={`header-icon-btn ${showHelp ? 'active' : ''}`}
          onClick={() => {
            setShowHelp(!showHelp)
            setShowNotifications(false)
            setShowApps(false)
          }}
          title="Aide & Protocole MCP"
          aria-label="Aide"
        >
          <IconHelp size={20} />
        </button>

        {/* Notifications Button */}
        <button
          className={`header-icon-btn ${showNotifications ? 'active' : ''}`}
          onClick={() => {
            setShowNotifications(!showNotifications)
            setShowHelp(false)
            setShowApps(false)
          }}
          title="Notifications"
          aria-label="Notifications"
        >
          <IconBell size={20} />
          {notifications.length > 0 && <span className="notification-dot" />}
        </button>

        {/* Apps Grid */}
        <button
          className={`header-icon-btn ${showApps ? 'active' : ''}`}
          onClick={() => {
            setShowApps(!showApps)
            setShowHelp(false)
            setShowNotifications(false)
          }}
          title="Applications"
          aria-label="Menu des applications"
        >
          <IconGrid size={19} />
        </button>

        {/* Profile Avatar */}
        <button
          className="profile-avatar-btn"
          title="Profil Alex Laurent"
          aria-label="Compte utilisateur"
        >
          <IconUser size={18} />
        </button>
      </div>

      {/* Help Popover */}
      {showHelp && (
        <div className="adobe-popover" role="dialog" aria-label="Aide">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="popover-title">Passerelle MCP pour IA</span>
            <button onClick={() => setShowHelp(false)} className="header-icon-btn" style={{ width: 28, height: 28 }}>
              <IconClose size={16} />
            </button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Cette plateforme transforme n'importe quel site web en <strong>serveur MCP (Model Context Protocol)</strong> que Claude, Cursor ou vos agents IA peuvent interroger et actionner.
          </p>
          <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong>Principe de sécurité :</strong> Toute action engageante (réservation, commande) exige une confirmation explicite de l'utilisateur.
          </div>
        </div>
      )}

      {/* Notifications Popover */}
      {showNotifications && (
        <div className="adobe-popover" role="dialog" aria-label="Notifications">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="popover-title">Activité récente</span>
            <button onClick={() => setShowNotifications(false)} className="header-icon-btn" style={{ width: 28, height: 28 }}>
              <IconClose size={16} />
            </button>
          </div>
          {notifications.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucune nouvelle notification.</p>
          ) : (
            notifications.map((notif, idx) => (
              <div key={idx} className="popover-item">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{notif.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{notif.time || 'À l’instant'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Apps Popover */}
      {showApps && (
        <div className="adobe-popover" role="dialog" aria-label="Applications">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="popover-title">Outils MCP</span>
            <button onClick={() => setShowApps(false)} className="header-icon-btn" style={{ width: 28, height: 28 }}>
              <IconClose size={16} />
            </button>
          </div>
          <div className="popover-item" style={{ cursor: 'pointer' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-red)' }}>⚡</span>
            <span>MCP Studio</span>
          </div>
          <div className="popover-item" style={{ cursor: 'pointer' }}>
            <span style={{ fontWeight: 700, color: 'var(--blue)' }}>🔗</span>
            <span>Claude Connector</span>
          </div>
          <div className="popover-item" style={{ cursor: 'pointer' }}>
            <span style={{ fontWeight: 700, color: 'var(--purple)' }}>📊</span>
            <span>Audit & Logs IA</span>
          </div>
        </div>
      )}
    </header>
  )
}
