import React, { useEffect, useRef, useState } from 'react'
import {
  AdobeLogo,
  IconHelp,
  IconBell,
  IconUser,
  IconMoon,
  IconSun,
  IconGlobe,
  IconClose,
} from './Icons'

export default function Header({
  colorScheme,
  setColorScheme,
  language,
  setLanguage,
  onNavigateHome,
  notifications = [],
  currentUser,
  onNavigate,
  t,
}) {
  const [openPopover, setOpenPopover] = useState(null) // 'help' | 'notifications' | 'profile'
  const headerRef = useRef(null)
  const showHelp = openPopover === 'help'
  const showNotifications = openPopover === 'notifications'
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

  const toggleTheme = () => {
    setColorScheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'fr' : 'en'))
  }

  return (
    <header className="adobe-header" ref={headerRef}>
      <div className="adobe-header-left">
        <button
          className="adobe-logo-btn"
          onClick={onNavigateHome}
          title="Adobe"
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
          title={colorScheme === 'dark' ? t.themeLight : t.themeDark}
          aria-label={colorScheme === 'dark' ? t.themeLight : t.themeDark}
        >
          {colorScheme === 'dark' ? <IconSun size={19} /> : <IconMoon size={19} />}
        </button>

        {/* Help Button */}
        <button
          className={`header-icon-btn ${showHelp ? 'active' : ''}`}
          onClick={() => togglePopover('help')}
          title={t.helpTitle}
          aria-label={t.helpTitle}
        >
          <IconHelp size={20} />
        </button>

        {/* Notifications Button */}
        <button
          className={`header-icon-btn ${showNotifications ? 'active' : ''}`}
          onClick={() => togglePopover('notifications')}
          title={t.notificationsTitle}
          aria-label={t.notificationsTitle}
        >
          <IconBell size={20} />
          {notifications.length > 0 && <span className="notification-dot" />}
        </button>

        {/* Language Switcher (Replaces 9-dots icon) */}
        <button
          className="header-lang-btn"
          onClick={toggleLanguage}
          title={t.languageToggle}
          aria-label={t.languageToggle}
        >
          <IconGlobe size={17} />
          <span className="lang-code-tag">{language.toUpperCase()}</span>
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
        <div className="adobe-popover" role="dialog" aria-label="Help">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="popover-title">{t.helpTitle}</span>
            <button
              type="button"
              aria-label="Fermer"
              onClick={closePopover}
              className="header-icon-btn"
              style={{ width: 28, height: 28 }}
            >
              <IconClose size={16} />
            </button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t.helpDesc}
          </p>
          <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong>{t.safetyPrinciple}</strong>
          </div>
        </div>
      )}

      {/* Notifications Popover */}
      {showNotifications && (
        <div className="adobe-popover" role="dialog" aria-label="Notifications">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="popover-title">{t.notificationsTitle}</span>
            <button
              type="button"
              aria-label="Fermer"
              onClick={closePopover}
              className="header-icon-btn"
              style={{ width: 28, height: 28 }}
            >
              <IconClose size={16} />
            </button>
          </div>
          {notifications.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.noNotifications}</p>
          ) : (
            notifications.map((notif, idx) => (
              <div key={idx} className="popover-item">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{notif.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{notif.time}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Profile Popover */}
      {showProfile && (
        <div className="adobe-popover" role="dialog" aria-label="Compte">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="popover-title">{currentUser?.name || 'Compte'}</span>
            <button
              type="button"
              aria-label="Fermer"
              onClick={closePopover}
              className="header-icon-btn"
              style={{ width: 28, height: 28 }}
            >
              <IconClose size={16} />
            </button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
            {currentUser ? currentUser.email : (language === 'fr' ? 'Vous n’êtes pas connecté.' : 'You are not signed in.')}
          </p>
        </div>
      )}
    </header>
  )
}
