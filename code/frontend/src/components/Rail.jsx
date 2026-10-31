import React from 'react'
import {
  IconPlus,
  IconHome,
  IconServers,
  IconCollapse,
} from './Icons'

export default function Rail({ activePage, setPage, onNewMcp }) {
  return (
    <aside className="adobe-rail">
      {/* Top Red Circle '+' Button */}
      <button
        className="rail-btn-create"
        onClick={onNewMcp}
        title="Connecter un nouveau site"
        aria-label="Connecter un nouveau site"
      >
        <IconPlus size={22} />
      </button>

      {/* Navigation Icons */}
      <nav className="rail-nav">
        {/* Home / Connect View */}
        <button
          className={`rail-item-btn ${activePage === 'home' ? 'active' : ''}`}
          onClick={() => setPage('home')}
          title="Accueil / Connecter"
          aria-label="Accueil"
        >
          <IconHome size={22} />
        </button>

        {/* MCP Management View */}
        <button
          className={`rail-item-btn ${activePage === 'servers' ? 'active' : ''}`}
          onClick={() => setPage('servers')}
          title="Gestion des serveurs MCP"
          aria-label="Serveurs MCP"
        >
          <IconServers size={22} />
        </button>
      </nav>

      <div className="rail-spacer" />

      {/* Bottom Drawer / Expand Button */}
      <button
        className="rail-btn-bottom"
        onClick={() => setPage(activePage === 'home' ? 'servers' : 'home')}
        title={activePage === 'home' ? 'Voir mes serveurs MCP' : 'Retour à la connexion'}
        aria-label="Changer de vue"
      >
        <IconCollapse size={20} />
      </button>
    </aside>
  )
}
