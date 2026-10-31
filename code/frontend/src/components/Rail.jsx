import React from 'react'
import {
  IconPlus,
  IconHome,
  IconServers,
  IconCollapse,
} from './Icons'

export default function Rail({
  activePage,
  setPage,
  onNewMcp,
  isExpanded,
  onToggleExpand,
  t,
}) {
  return (
    <aside className={`adobe-rail ${isExpanded ? 'is-expanded' : ''}`}>
      {/* Top Red '+' Button */}
      <button
        className={`rail-btn-create ${isExpanded ? 'expanded' : ''}`}
        onClick={onNewMcp}
        title={t.newMcp}
        aria-label={t.newMcp}
      >
        <IconPlus size={20} />
        {isExpanded && <span className="rail-btn-label">{t.newMcp}</span>}
      </button>

      {/* Navigation Items */}
      <nav className="rail-nav">
        {/* Home / Connect View */}
        <button
          className={`rail-item-btn ${activePage === 'home' ? 'active' : ''} ${isExpanded ? 'expanded' : ''}`}
          onClick={() => setPage('home')}
          title={t.home}
          aria-label={t.home}
          aria-current={activePage === 'home' ? 'page' : undefined}
        >
          <IconHome size={22} />
          {isExpanded && <span className="rail-item-label">{t.home}</span>}
        </button>

        {/* MCP Management View */}
        <button
          className={`rail-item-btn ${activePage === 'servers' ? 'active' : ''} ${isExpanded ? 'expanded' : ''}`}
          onClick={() => setPage('servers')}
          title={t.myMcps}
          aria-label={t.myMcps}
          aria-current={activePage === 'servers' ? 'page' : undefined}
        >
          <IconServers size={22} />
          {isExpanded && <span className="rail-item-label">{t.myMcps}</span>}
        </button>
      </nav>

      <div className="rail-spacer" />

      {/* Bottom Expand / Collapse Button */}
      <button
        className={`rail-btn-bottom ${isExpanded ? 'expanded' : ''}`}
        onClick={onToggleExpand}
        title={isExpanded ? t.collapseRail : t.expandRail}
        aria-label={isExpanded ? t.collapseRail : t.expandRail}
      >
        <div style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', display: 'flex' }}>
          <IconCollapse size={20} />
        </div>
        {isExpanded && <span className="rail-item-label">{t.collapseRail}</span>}
      </button>
    </aside>
  )
}
