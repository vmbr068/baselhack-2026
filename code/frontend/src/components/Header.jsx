import React, { useState } from 'react'
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
  t,
}) {
  const [showHelp, setShowHelp] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const toggleTheme = () => {
    setColorScheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'fr' : 'en'))
  }

  return (
    <header className="adobe-header">
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
          onClick={() => {
            setShowHelp(!showHelp)
            setShowNotifications(false)
          }}
          title={t.helpTitle}
          aria-label="Help"
        >
          <IconHelp size={20} />
        </button>

        {/* Notifications Button */}
        <button
          className={`header-icon-btn ${showNotifications ? 'active' : ''}`}
          onClick={() => {
            setShowNotifications(!showNotifications)
            setShowHelp(false)
          }}
          title={t.notificationsTitle}
          aria-label="Notifications"
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
          className="profile-avatar-btn"
          title="Alex Laurent"
          aria-label="User Profile"
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
              onClick={() => setShowHelp(false)}
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
              onClick={() => setShowNotifications(false)}
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
    </header>
  )
}
