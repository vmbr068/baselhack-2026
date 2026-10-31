import React, { useEffect, useRef, useState } from 'react'
import {
  AdobeLogo,
  IconHelp,
  IconBell,
  IconGrid,
  IconUser,
  IconMoon,
  IconSun,
  IconClose,
} from './Icons'

export default function Header({
  colorScheme,
  setColorScheme,
  onNavigateHome,
  notifications = [],
  currentUser,
  onNavigate,
}) {
  const [openPopover, setOpenPopover] = useState(null) // 'help' | 'notifications' | 'apps' | 'profile'
  const headerRef = useRef(null)
  const showHelp = openPopover === 'help'
  const showNotifications = openPopover === 'notifications'
  const showApps = openPopover === 'apps'
  const showProfile = openPopover === 'profile'
  const togglePopover = (name) => setOpenPopover((current) => (current === name ? null : name))
  const closePopover = () => setOpenPopover(null)

  useEffect(() => {
    if (!openPopover) return undefined
    const handlePointerDown = (e) => {
      if (!headerRef.current?.contains(e.target)) closePopover()
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closePopover()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openPopover])

  const openApp = (page) => {
    onNavigate(page)
    closePopover()
  }

  const toggleTheme = () => {
    setColorScheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <header className="adobe-header" ref={headerRef}>
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
          onClick={() => togglePopover('help')}
          title="Aide & Protocole MCP"
          aria-label="Aide"
        >
          <IconHelp size={20} />
        </button>

        {/* Notifications Button */}
        <button
          className={`header-icon-btn ${showNotifications ? 'active' : ''}`}
          onClick={() => togglePopover('notifications')}
          title="Notifications"
          aria-label="Notifications"
        >
          <IconBell size={20} />
          {notifications.length > 0 && <span className="notification-dot" />}
        </button>

        {/* Apps Grid */}
        <button
          className={`header-icon-btn ${showApps ? 'active' : ''}`}
          onClick={() => togglePopover('apps')}
          title="Applications"
          aria-label="Menu des applications"
        >
          <IconGrid size={19} />
        </button>

        {/* Profile Avatar */}
        <button
          className={`profile-avatar-btn ${showProfile ? 'active' : ''}`}
          onClick={() => togglePopover('profile')}
          title={currentUser?.name || currentUser?.email || 'Compte'}
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
            <button type="button" aria-label="Fermer" onClick={closePopover} className="header-icon-btn" style={{ width: 28, height: 28 }}>
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
            <button type="button" aria-label="Fermer" onClick={closePopover} className="header-icon-btn" style={{ width: 28, height: 28 }}>
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
            <button type="button" aria-label="Fermer" onClick={closePopover} className="header-icon-btn" style={{ width: 28, height: 28 }}>
              <IconClose size={16} />
            </button>
          </div>
          <button type="button" className="popover-item" onClick={() => openApp('home')}>
            <span style={{ fontWeight: 700, color: 'var(--accent-red)' }}>⚡</span>
            <span>Créer un MCP</span>
          </button>
          <button type="button" className="popover-item" onClick={() => openApp('servers')}>
            <span style={{ fontWeight: 700, color: 'var(--blue)' }}>🔗</span>
            <span>Mes serveurs MCP</span>
          </button>
        </div>
      )}

      {/* Profile Popover */}
      {showProfile && (
        <div className="adobe-popover" role="dialog" aria-label="Compte">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="popover-title">Compte</span>
            <button type="button" aria-label="Fermer" onClick={closePopover} className="header-icon-btn" style={{ width: 28, height: 28 }}>
              <IconClose size={16} />
            </button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
            {currentUser ? currentUser.email : 'Vous n’êtes pas connecté.'}
          </p>
        </div>
      )}
    </header>
  )
}
