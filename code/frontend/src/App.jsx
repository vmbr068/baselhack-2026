import { useMemo, useState } from 'react'
import MagicWand from '@react-spectrum/s2/icons/MagicWand'
import Add from '@react-spectrum/s2/icons/Add'
import ChartTrend from '@react-spectrum/s2/icons/ChartTrend'
import Checkmark from '@react-spectrum/s2/icons/Checkmark'
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown'
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight'
import Close from '@react-spectrum/s2/icons/Close'
import Data from '@react-spectrum/s2/icons/Data'
import GlobeGrid from '@react-spectrum/s2/icons/GlobeGrid'
import HelpCircle from '@react-spectrum/s2/icons/HelpCircle'
import HomeIcon from '@react-spectrum/s2/icons/Home'
import Link from '@react-spectrum/s2/icons/Link'
import Lock from '@react-spectrum/s2/icons/Lock'
import Search from '@react-spectrum/s2/icons/Search'
import Settings from '@react-spectrum/s2/icons/Settings'
import Refresh from '@react-spectrum/s2/icons/Refresh'
import SiGithub from '@icons-pack/react-simple-icons/icons/SiGithub'

const initialServers = [
  { id: 1, name: 'Atelier Studio', url: 'atelier-studio.example', source: 'GitHub', status: 'active', routes: 8, updated: 'Il y a 2 h', color: 'violet', initials: 'AS' },
  { id: 2, name: 'Maison Auguste', url: 'maison-auguste.example', source: 'WordPress', status: 'attention', routes: 5, updated: 'Il y a 15 min', attentionReason: { fr: 'La synchronisation a échoué : l’accès WordPress a expiré.', en: 'Sync failed: WordPress access has expired.' }, color: 'orange', initials: 'MA' },
  { id: 3, name: 'Fika Coffee', url: 'fika-coffee.example', source: 'GitHub', status: 'active', routes: 12, updated: 'Il y a 3 jours', color: 'green', initials: 'FK' },
]

const activityEvents = [
  { id: 'sync-failed', serverId: 2, type: 'action', group: 'today', time: '09:42', title: 'eventSyncFailed', description: 'eventSyncFailedDescription' },
  { id: 'routes-updated', serverId: 1, type: 'change', group: 'today', time: '08:16', title: 'eventRoutesUpdated', description: 'eventRoutesUpdatedDescription' },
  { id: 'sync-completed', serverId: 1, type: 'change', group: 'yesterday', time: '16:22', title: 'eventSyncCompleted', description: 'eventSyncCompletedDescription' },
  { id: 'mcp-created', serverId: 3, type: 'change', group: 'earlier', time: '', title: 'eventMcpCreated', description: 'eventMcpCreatedDescription' },
]

const translations = {
  fr: {
    home: 'Accueil', servers: 'Mes MCP', activity: 'Activité', settings: 'Paramètres', help: 'Besoin d’aide ?', logout: 'Se déconnecter',
    welcome: 'Bonjour, Alex', heading: 'Que souhaitez-vous connecter ?', subheading: 'Décrivez votre projet. MCPEX analyse votre site et vous guide pour créer un MCP.',
    urlLabel: 'URL de votre site', placeholder: 'https://votre-site.com', analyze: 'Analyser le site', secure: 'Vos données restent privées et sécurisées',
    recent: 'Récemment consultés', seeAll: 'Tout voir', active: 'Actif', attention: 'Action requise', routes: 'routes', updated: 'Mis à jour',
    integrations: 'Sources compatibles', github: 'Dépôt GitHub', wordpress: 'WordPress', more: 'Et bien plus',
    mcpTitle: 'Mes MCP', mcpDescription: 'Retrouvez vos connexions, leurs routes et leur état.', search: 'Rechercher un MCP…', all: 'Tous',
    details: 'Voir les routes', update: 'Mettre à jour', empty: 'Aucun MCP trouvé.',
    analyzing: 'Analyse en cours', analysisSub: 'Nous repérons la plateforme de votre site et les accès nécessaires.', step1: 'Connexion au site', step2: 'Détection de la plateforme', step3: 'Préparation des prochaines étapes', done: 'Analyse terminée',
    sourceTitle: 'Votre site est prêt à être connecté', sourceSub: 'Nous avons détecté une application web. Choisissez où se trouve son code pour continuer.', connectGithub: 'Connecter GitHub', connectWordpress: 'Connecter WordPress', otherSource: 'Autre source', restart: 'Analyser une autre URL',
    routesTitle: 'Routes disponibles', close: 'Fermer', account: 'Compte', language: 'Langue', login: 'Connexion', signup: 'Créer un compte', email: 'Adresse e-mail', password: 'Mot de passe', fullName: 'Nom complet', continue: 'Continuer', or: 'ou', noAccount: 'Pas encore de compte ?', hasAccount: 'Déjà un compte ?', welcomeBack: 'Content de vous revoir', createAccount: 'Votre espace de travail commence ici', loginSub: 'Connectez-vous à votre espace MCPEX.', signupSub: 'Créez votre compte professionnel MCPEX.',
    workspace: 'Espace de travail', newMcp: 'Nouveau MCP', workspaceEyebrow: 'VOTRE PASSERELLE VERS LES AGENTS IA', recentDescription: 'Vos projets, au même endroit.', firstStep: 'Étape 1 sur 3', workspaceSecurity: 'Vous gardez le contrôle. Chaque action sensible nécessite votre confirmation.', sourceConnected: 'La connexion est prête à être configurée.', otherSourceNext: 'Vous pourrez sélectionner cette source lors de la prochaine étape.', navLabel: 'ESPACE DE TRAVAIL', footerTag: 'CONÇU POUR LES ÉQUIPES QUI CONSTRUISENT L’AVENIR', footerLanguage: 'FR · CH', placeholderSubtitle: 'Cette section sera bientôt disponible dans votre espace MCPEX.',
    tableProject: 'PROJET', tableSource: 'SOURCE', tableStatus: 'ÉTAT', tableRoutes: 'ROUTES', tableUpdated: 'MISE À JOUR', mcpCount: count => `${count} MCP${count > 1 ? 's' : ''} dans votre espace`, localData: 'Données locales d’exemple', detailEyebrow: 'DÉTAILS DU MCP', activeRoutes: 'ROUTES ACTIVES', lastUpdate: 'DERNIÈRE MISE À JOUR', routeSectionDescription: 'Choisissez les routes exposées à vos agents.', routeDescriptions: ['Lister les produits disponibles', 'Consulter un produit', 'Ajouter un article au panier', 'Consulter les commandes'], safetyConfirm: 'Les réservations et paiements exigent une confirmation humaine.',
    activityDescription: 'Suivez les créations, mises à jour et synchronisations de vos MCP.', activityFilterAll: 'Tout', activityFilterAction: 'Action requise', activityFilterChanges: 'Modifications', activitySearch: 'Rechercher dans l’activité…', activityEmpty: 'Aucun événement ne correspond à ces filtres.', today: 'Aujourd’hui', yesterday: 'Hier', earlier: 'Plus tôt', viewMcp: 'Voir le MCP', activitySample: 'Événements locaux d’exemple', eventSyncFailed: 'Échec de synchronisation', eventSyncFailedDescription: 'L’accès WordPress a expiré. Une reconnexion est nécessaire.', eventRoutesUpdated: 'Routes mises à jour', eventRoutesUpdatedDescription: '2 routes ont été modifiées et publiées.', eventSyncCompleted: 'Synchronisation réussie', eventSyncCompletedDescription: 'Les routes sont à jour avec le dépôt GitHub.', eventMcpCreated: 'MCP créé', eventMcpCreatedDescription: 'Le dépôt GitHub a été synchronisé pour la première fois.', syncFailureTitle: 'Synchronisation en échec', reconnect: 'Reconnecter WordPress', reconnectBackend: 'La reconnexion sera disponible avec le backend.',
    authArtTag: 'ESPACE DE TRAVAIL MCPEX', authArtTitle: <>Connectez vos outils.<br />Libérez vos agents.</>, authArtDescription: 'Une passerelle sécurisée entre votre site web et les outils d’IA de votre équipe.', authTagLogin: 'VOTRE ESPACE DE TRAVAIL', authTagSignup: 'PREMIERS PAS', forgot: 'Mot de passe oublié ?', google: 'Continuer avec Google', legal: <>En continuant, vous acceptez nos <a href="#terms">Conditions d’utilisation</a> et notre <a href="#privacy">Politique de confidentialité</a>.</>, privacy: 'Confidentialité', support: 'Assistance',
  },
  en: {
    home: 'Home', servers: 'My MCPs', activity: 'Activity', settings: 'Settings', help: 'Need help?', logout: 'Sign out',
    welcome: 'Hello, Alex', heading: 'What would you like to connect?', subheading: 'Describe your project. MCPEX analyses your site and guides you through creating an MCP.',
    urlLabel: 'Website URL', placeholder: 'https://your-website.com', analyze: 'Analyse website', secure: 'Your data stays private and secure',
    recent: 'Recently viewed', seeAll: 'View all', active: 'Active', attention: 'Action required', routes: 'routes', updated: 'Updated',
    integrations: 'Compatible sources', github: 'GitHub repository', wordpress: 'WordPress', more: 'And many more',
    mcpTitle: 'My MCPs', mcpDescription: 'Manage your connections, routes and status.', search: 'Search MCPs…', all: 'All',
    details: 'View routes', update: 'Update', empty: 'No MCPs found.',
    analyzing: 'Analysing website', analysisSub: 'We’re identifying your website platform and the access it needs.', step1: 'Connecting to website', step2: 'Detecting platform', step3: 'Preparing next steps', done: 'Analysis complete',
    sourceTitle: 'Your website is ready to connect', sourceSub: 'We detected a web application. Choose where its code lives to continue.', connectGithub: 'Connect GitHub', connectWordpress: 'Connect WordPress', otherSource: 'Another source', restart: 'Analyse another URL',
    routesTitle: 'Available routes', close: 'Close', account: 'Account', language: 'Language', login: 'Sign in', signup: 'Create account', email: 'Email address', password: 'Password', fullName: 'Full name', continue: 'Continue', or: 'or', noAccount: 'New to MCPEX?', hasAccount: 'Already have an account?', welcomeBack: 'Welcome back', createAccount: 'Your workspace starts here', loginSub: 'Sign in to your MCPEX workspace.', signupSub: 'Create your MCPEX business account.',
    workspace: 'Workspace', newMcp: 'New MCP', workspaceEyebrow: 'YOUR BRIDGE TO AI AGENTS', recentDescription: 'Your projects, all in one place.', firstStep: 'Step 1 of 3', workspaceSecurity: 'You stay in control. Sensitive actions always require your confirmation.', sourceConnected: 'Connection is ready to be configured.', otherSourceNext: 'You can select this source in the next step.', navLabel: 'WORKSPACE', footerTag: 'BUILT FOR TEAMS BUILDING WHAT’S NEXT', footerLanguage: 'EN · CH', placeholderSubtitle: 'This section will be available in your MCPEX workspace soon.',
    tableProject: 'PROJECT', tableSource: 'SOURCE', tableStatus: 'STATUS', tableRoutes: 'ROUTES', tableUpdated: 'UPDATED', mcpCount: count => `${count} MCP${count === 1 ? '' : 's'} in your workspace`, localData: 'Local sample data', detailEyebrow: 'MCP DETAILS', activeRoutes: 'ACTIVE ROUTES', lastUpdate: 'LAST UPDATED', routeSectionDescription: 'Choose which routes your agents can access.', routeDescriptions: ['List available products', 'View a product', 'Add an item to the cart', 'View orders'], safetyConfirm: 'Bookings and payments require human confirmation.',
    activityDescription: 'Track MCP creation, updates, and sync events.', activityFilterAll: 'All', activityFilterAction: 'Action required', activityFilterChanges: 'Changes', activitySearch: 'Search activity…', activityEmpty: 'No events match these filters.', today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier', viewMcp: 'View MCP', activitySample: 'Local sample events', eventSyncFailed: 'Sync failed', eventSyncFailedDescription: 'WordPress access has expired. Reconnect to continue.', eventRoutesUpdated: 'Routes updated', eventRoutesUpdatedDescription: '2 routes were changed and published.', eventSyncCompleted: 'Sync completed', eventSyncCompletedDescription: 'Routes are up to date with the GitHub repository.', eventMcpCreated: 'MCP created', eventMcpCreatedDescription: 'The GitHub repository was synced for the first time.', syncFailureTitle: 'Sync failed', reconnect: 'Reconnect WordPress', reconnectBackend: 'Reconnection will be available when the backend is connected.',
    authArtTag: 'MCPEX / WORKSPACE', authArtTitle: <>Connect your tools.<br />Unlock your agents.</>, authArtDescription: 'One secure bridge between your website and the AI tools your team uses every day.', authTagLogin: 'YOUR WORKSPACE', authTagSignup: 'GET STARTED', forgot: 'Forgot password?', google: 'Continue with Google', legal: <>By continuing, you agree to our <a href="#terms">Terms of Use</a> and <a href="#privacy">Privacy Policy</a>.</>, privacy: 'Privacy', support: 'Support',
  },
}

const routeCatalog = [
  { method: 'GET', path: '/products', enabled: true },
  { method: 'GET', path: '/products/{id}', enabled: true },
  { method: 'POST', path: '/cart/items', enabled: true },
  { method: 'GET', path: '/orders', enabled: false },
]

const spectrumIcons = {
  spark: MagicWand,
  plus: Add,
  home: HomeIcon,
  cube: Data,
  activity: ChartTrend,
  settings: Settings,
  help: HelpCircle,
  arrow: ChevronRight,
  globe: GlobeGrid,
  search: Search,
  chevron: ChevronDown,
  close: Close,
  external: Link,
  lock: Lock,
  check: Checkmark,
  refresh: Refresh,
}

function Icon({ name, size = 20, className = '', ...props }) {
  const SpectrumIcon = spectrumIcons[name] || MagicWand
  return <SpectrumIcon aria-hidden="true" UNSAFE_className={`spectrum-icon ${className}`} UNSAFE_style={{ width: size, height: size, '--iconPrimary': 'currentColor' }} {...props} />
}

function Wordmark({ compact = false }) {
  return <div className="wordmark"><span className="brand-mark"><Icon name="spark" size={18} /></span>{!compact && <span>MCPEX</span>}</div>
}

function SourceMark({ source }) {
  return <span className={`source-mark ${source.toLowerCase()}`}>{source === 'GitHub' ? <SiGithub size={13} aria-hidden="true" title="" /> : source === 'WordPress' ? 'W' : '↗'}</span>
}

function Status({ status, t }) {
  return <span className={`status status-${status}`}><span className="status-dot" />{status === 'active' ? t.active : t.attention}</span>
}

function formatUpdated(value, language) {
  if (language === 'fr') return value
  return ({ 'À l’instant': 'Just now', 'Il y a 15 min': '15 minutes ago', 'Il y a 2 h': '2 hours ago', Hier: 'Yesterday', 'Il y a 3 jours': '3 days ago' })[value] || value
}

function ServerCard({ server, t, language, onSelect }) {
  return <button className="server-card" onClick={() => onSelect(server)}>
    <span className={`server-avatar ${server.color}`}>{server.initials}</span>
    <span className="server-card-copy"><strong>{server.name}</strong><span>{server.url}</span></span>
    <span className="server-card-meta"><Status status={server.status} t={t} /><span>{server.routes} {t.routes}</span></span>
    <Icon name="arrow" size={17} className="card-arrow" />
  </button>
}

function Sidebar({ page, setPage, t, onNew, language, setLanguage, onAuth }) {
  return <aside className="sidebar">
    <div className="sidebar-top"><Wordmark /><button className="icon-button mobile-close" aria-label="Fermer le menu" onClick={() => setPage('home')}><Icon name="close" /></button></div>
    <button className="new-button" onClick={onNew}><Icon name="plus" size={18} /><span>{t.newMcp}</span><span className="shortcut">⌘ K</span></button>
    <div className="nav-section-label">{t.navLabel}</div>
    <nav className="main-nav" aria-label="Navigation principale">
      <button className={page === 'home' ? 'nav-item selected' : 'nav-item'} onClick={() => setPage('home')}><Icon name="home" /><span>{t.home}</span></button>
      <button className={page === 'servers' ? 'nav-item selected' : 'nav-item'} onClick={() => setPage('servers')}><Icon name="cube" /><span>{t.servers}</span><span className="nav-count">03</span></button>
      <button className={page === 'activity' ? 'nav-item selected' : 'nav-item'} onClick={() => setPage('activity')}><Icon name="activity" /><span>{t.activity}</span></button>
    </nav>
    <div className="sidebar-spacer" />
    <div className="sidebar-bottom">
      <button className="nav-item" onClick={() => setPage('settings')}><Icon name="settings" /><span>{t.settings}</span></button>
      <button className="nav-item help-item"><Icon name="help" /><span>{t.help}</span><Icon name="external" size={15} /></button>
      <div className="sidebar-divider" />
      <div className="account-card">
        <span className="account-avatar">AL</span><span className="account-copy"><strong>Alex Laurent</strong><span>alex@atelier-studio.ch</span></span>
        <button className="icon-button account-menu" aria-label={t.account} onClick={() => onAuth('login')}><Icon name="chevron" size={17} /></button>
      </div>
      <button className="language-switch" onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}><Icon name="globe" size={16} /><span>{t.language}</span><strong>{language.toUpperCase()}</strong></button>
    </div>
  </aside>
}

function Home({ t, language, servers, onSelect, onViewAll, onAnalyze, stage, analyzedUrl, setStage }) {
  const [url, setUrl] = useState('')
  const [sourceMessage, setSourceMessage] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!url.trim()) return
    onAnalyze(url.trim())
    setStage('analyzing')
    window.setTimeout(() => setStage('result'), 1550)
  }
  return <main className="main-content home-content">
    <div className="home-toolbar"><span className="breadcrumb">{t.workspace} <span>/</span> {t.home}</span><button className="quiet-button"><Icon name="help" size={17} />{language === 'fr' ? 'Guide de démarrage' : 'Getting started'}</button></div>
    {stage === 'result' ? <section className="analysis-result panel-in">
      <span className="result-icon"><Icon name="check" size={24} /></span><p className="eyebrow">{t.done}</p><h1>{t.sourceTitle}</h1><p className="result-url"><Icon name="globe" size={15} /> {analyzedUrl}</p><p className="result-subtitle">{t.sourceSub}</p>
      <div className="source-choices">
        <button className="source-choice" onClick={() => setSourceMessage('GitHub')}><SourceMark source="GitHub" /><span><strong>{t.connectGithub}</strong><small>Repositories and source code</small></span><Icon name="arrow" size={17} /></button>
        <button className="source-choice" onClick={() => setSourceMessage('WordPress')}><SourceMark source="WordPress" /><span><strong>{t.connectWordpress}</strong><small>WordPress.com or self-hosted</small></span><Icon name="arrow" size={17} /></button>
        <button className="source-choice" onClick={() => setSourceMessage('other')}><span className="source-mark other">↗</span><span><strong>{t.otherSource}</strong><small>GitLab, Shopify, or a custom API</small></span><Icon name="arrow" size={17} /></button>
      </div>
      {sourceMessage && <div className="inline-notice"><Icon name="check" size={16} /> {sourceMessage === 'other' ? t.otherSourceNext : t.sourceConnected}</div>}
      <button className="text-button back-link" onClick={() => setStage('idle')}>← {t.restart}</button>
    </section> : <>
      <section className="hero-section">
        <div className="hero-spark"><Icon name="spark" size={22} /></div>
        <p className="eyebrow">{t.workspaceEyebrow}</p>
        <h1>{t.heading}</h1>
        <p className="hero-subtitle">{t.subheading}</p>
        <form className={`url-composer ${stage === 'analyzing' ? 'is-loading' : ''}`} onSubmit={submit}>
          {stage === 'analyzing' ? <div className="loading-view"><span className="spinner" /><div><strong>{t.analyzing}</strong><span>{analyzedUrl}</span></div><span className="loading-percent">68%</span></div> : <>
            <label htmlFor="site-url">{t.urlLabel}</label>
            <div className="url-input-row"><Icon name="globe" size={19} /><input id="site-url" type="url" placeholder={t.placeholder} value={url} onChange={e => setUrl(e.target.value)} required /><button className="primary-button" type="submit">{t.analyze}<Icon name="arrow" size={16} /></button></div>
            <div className="composer-footer"><span><Icon name="lock" size={14} /> {t.secure}</span><span>{t.firstStep}</span></div>
          </>}
          {stage === 'analyzing' && <div className="analysis-steps"><span className="step-done"><Icon name="check" size={14} /> {t.step1}</span><span className="step-current"><i /> {t.step2}</span><span>{t.step3}</span></div>}
        </form>
        <div className="integration-row"><span>{t.integrations}</span><span className="integration-chip"><SourceMark source="GitHub" />{t.github}</span><span className="integration-chip"><SourceMark source="WordPress" />{t.wordpress}</span><span className="integration-more">{t.more}</span></div>
      </section>
      <section className="recent-section"><div className="section-heading"><div><h2>{t.recent}</h2><p>{t.recentDescription}</p></div><button className="text-button" onClick={onViewAll}>{t.seeAll}<Icon name="arrow" size={15} /></button></div><div className="server-list">{servers.slice(0, 2).map(server => <ServerCard key={server.id} server={server} t={t} language={language} onSelect={onSelect} />)}</div></section>
      <div className="home-footnote"><span className="footnote-icon"><Icon name="lock" size={14} /></span><span>{t.workspaceSecurity}</span><button className="icon-button" aria-label={t.help}><Icon name="external" size={14} /></button></div>
    </>}
  </main>
}

function ServersPage({ t, language, servers, onSelect, onNew }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => servers.filter(s => `${s.name} ${s.url} ${s.source}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || s.status === filter)), [servers, query, filter])
  return <main className="main-content list-page"><div className="page-toolbar"><span className="breadcrumb">{t.workspace} <span>/</span> {t.servers}</span></div>
    <div className="page-heading-row"><div><p className="eyebrow">{language === 'fr' ? 'VOTRE ESPACE' : 'YOUR WORKSPACE'}</p><h1>{t.mcpTitle}</h1><p>{t.mcpDescription}</p></div><button className="primary-button" onClick={onNew}><Icon name="plus" size={17} /> {t.newMcp}</button></div>
    <div className="list-controls"><div className="search-field"><Icon name="search" size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search} /></div><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t.all}<span>3</span></button><button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>{t.active}<span>2</span></button><button className={filter === 'attention' ? 'active' : ''} onClick={() => setFilter('attention')}>{t.attention}<span>1</span></button></div></div>
    <div className="server-table-wrap"><table className="server-table"><thead><tr><th>{t.tableProject}</th><th>{t.tableSource}</th><th>{t.tableStatus}</th><th>{t.tableRoutes}</th><th>{t.tableUpdated}</th><th /></tr></thead><tbody>{filtered.map(server => <tr key={server.id} onClick={() => onSelect(server)}><td><span className={`server-avatar small ${server.color}`}>{server.initials}</span><span className="table-name"><strong>{server.name}</strong><small>{server.url}</small></span></td><td><span className="table-source"><SourceMark source={server.source} />{server.source}</span></td><td><Status status={server.status} t={t} /></td><td>{server.routes}</td><td>{formatUpdated(server.updated, language)}</td><td><button className="icon-button row-action" aria-label={t.details}><Icon name="arrow" size={16} /></button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state">{t.empty}</div>}</div>
    <div className="table-foot">{t.mcpCount(filtered.length)}<span>{t.localData}</span></div>
  </main>
}

function DetailPanel({ server, t, language, onClose, onUpdate, onReconnect }) {
  const [enabled, setEnabled] = useState(() => routeCatalog.map(route => route.enabled))
  return <div className="drawer-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><aside className="detail-drawer" aria-label={server.name}>
    <div className="drawer-header"><span className="eyebrow">{t.detailEyebrow}</span><button className="icon-button" onClick={onClose} aria-label={t.close}><Icon name="close" /></button></div>
    <div className="drawer-project"><span className={`server-avatar ${server.color}`}>{server.initials}</span><div><h2>{server.name}</h2><a href={`https://${server.url}`} target="_blank" rel="noreferrer">{server.url}<Icon name="external" size={13} /></a></div><Status status={server.status} t={t} /></div>
    {server.status === 'attention' && <div className="sync-error-card" role="alert"><span className="sync-error-icon"><Icon name="help" size={17} /></span><div><strong>{t.syncFailureTitle}</strong><p>{server.attentionReason[language]}</p><button className="text-button" onClick={onReconnect}>{t.reconnect}<Icon name="arrow" size={14} /></button></div></div>}
    <div className="detail-metrics"><div><span>{t.activeRoutes}</span><strong>{enabled.filter(Boolean).length + server.routes - routeCatalog.length}</strong></div><div><span>{t.lastUpdate}</span><strong>{formatUpdated(server.updated, language)}</strong></div></div>
    <div className="routes-heading"><div><h3>{t.routesTitle}</h3><p>{t.routeSectionDescription}</p></div><button className="quiet-button compact" onClick={onUpdate}><Icon name="refresh" size={14} /> {t.update}</button></div>
    <div className="route-list">{routeCatalog.map((route, i) => <div className="route-row" key={route.path}><div className={`method method-${route.method.toLowerCase()}`}>{route.method}</div><div className="route-copy"><code>{route.path}</code><span>{t.routeDescriptions[i]}</span></div><button className={`toggle ${enabled[i] ? 'on' : ''}`} role="switch" aria-checked={enabled[i]} aria-label={`${route.path} ${enabled[i] ? 'active' : 'inactive'}`} onClick={() => setEnabled(current => current.map((value, index) => index === i ? !value : value))}><span /></button></div>)}</div>
    <div className="drawer-bottom"><div className="privacy-note"><Icon name="lock" size={16} /><span>{t.safetyConfirm}</span></div><button className="secondary-button full-width" onClick={onUpdate}><Icon name="refresh" size={15} /> {t.update}</button></div>
  </aside></div>
}

function ActivityPage({ t, language, servers, onSelect }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const matchingEvents = activityEvents.filter(event => {
    const server = servers.find(item => item.id === event.serverId)
    const matchesFilter = filter === 'all' || event.type === filter
    const content = `${server?.name || ''} ${server?.source || ''} ${t[event.title]} ${t[event.description]}`.toLowerCase()
    return matchesFilter && content.includes(query.toLowerCase())
  })
  const iconFor = event => event.type === 'action' ? 'help' : event.id === 'routes-updated' ? 'cube' : event.id === 'sync-completed' ? 'refresh' : 'plus'

  return <main className="main-content activity-page">
    <div className="page-toolbar"><span className="breadcrumb">{t.workspace} <span>/</span> {t.activity}</span></div>
    <div className="page-heading-row"><div><p className="eyebrow">{language === 'fr' ? 'JOURNAL DU WORKSPACE' : 'WORKSPACE LOG'}</p><h1>{t.activity}</h1><p>{t.activityDescription}</p></div></div>
    <div className="activity-controls"><div className="search-field"><Icon name="search" size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.activitySearch} /></div><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t.activityFilterAll}<span>{activityEvents.length}</span></button><button className={filter === 'action' ? 'active' : ''} onClick={() => setFilter('action')}>{t.activityFilterAction}<span>1</span></button><button className={filter === 'change' ? 'active' : ''} onClick={() => setFilter('change')}>{t.activityFilterChanges}<span>3</span></button></div></div>
    {['today', 'yesterday', 'earlier'].map(group => {
      const events = matchingEvents.filter(event => event.group === group)
      if (!events.length) return null
      return <section className="activity-group" key={group}><h2>{t[group]}</h2><div className="activity-timeline">{events.map(event => {
        const server = servers.find(item => item.id === event.serverId)
        return <article className={`activity-event ${event.type === 'action' ? 'event-action' : ''}`} key={event.id}>
          <div className={`activity-event-icon ${event.type === 'action' ? 'warning' : ''}`}><Icon name={iconFor(event)} size={17} /></div>
          <div className="activity-event-main"><div className="activity-event-heading"><div><strong>{t[event.title]}</strong><span className="event-project">{server?.name}</span></div><time>{event.time || formatUpdated(server?.updated || '', language)}</time></div><p>{t[event.description]}</p><div className="activity-event-footer"><span className="event-source"><SourceMark source={server?.source || ''} />{server?.source}</span>{event.type === 'action' && <Status status="attention" t={t} />}<button className="text-button" onClick={() => onSelect(server)}>{t.viewMcp}<Icon name="arrow" size={14} /></button></div></div>
        </article>
      })}</div></section>
    })}
    {matchingEvents.length === 0 && <div className="empty-state activity-empty">{t.activityEmpty}</div>}
    <div className="table-foot activity-foot">{t.activitySample}<span>{matchingEvents.length} / {activityEvents.length}</span></div>
  </main>
}

function AuthPage({ mode, setMode, t, language, setLanguage, onComplete }) {
  const signup = mode === 'signup'
  function submit(event) { event.preventDefault(); onComplete() }
  return <main className="auth-shell"><div className="auth-top"><Wordmark /><div className="auth-actions"><button className="quiet-button language-auth" onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}><Icon name="globe" size={15} />{language.toUpperCase()}</button><button className="quiet-button" onClick={() => setMode(signup ? 'login' : 'signup')}>{signup ? t.hasAccount : t.noAccount}<strong>{signup ? t.login : t.signup}</strong></button></div></div><div className="auth-content"><div className="auth-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-core"><Icon name="spark" size={36} /></div><span className="art-node node-one"><Icon name="globe" /></span><span className="art-node node-two"><Icon name="cube" /></span><span className="art-node node-three"><Icon name="check" /></span><div className="art-caption"><span>{t.authArtTag}</span><strong>{t.authArtTitle}</strong><p>{t.authArtDescription}</p></div></div><section className="auth-form-side"><p className="eyebrow">{signup ? t.authTagSignup : t.authTagLogin}</p><h1>{signup ? t.createAccount : t.welcomeBack}</h1><p>{signup ? t.signupSub : t.loginSub}</p><form onSubmit={submit}>{signup && <label>{t.fullName}<input autoComplete="name" placeholder="Alex Laurent" required /></label>}<label>{t.email}<input type="email" autoComplete="email" placeholder={language === 'fr' ? 'vous@entreprise.com' : 'you@company.com'} required /></label><label>{t.password}<input type="password" autoComplete={signup ? 'new-password' : 'current-password'} placeholder="••••••••••" minLength="8" required /></label>{!signup && <button type="button" className="forgot-link">{t.forgot}</button>}<button className="primary-button auth-submit" type="submit">{signup ? t.signup : t.login}<Icon name="arrow" size={16} /></button></form><div className="auth-separator"><span />{t.or}<span /></div><button className="sso-button" onClick={onComplete}><span className="google-mark">G</span> {t.google}</button><div className="auth-legal">{t.legal}</div></section></div><footer className="auth-footer"><span>© 2026 MCPEX</span><button>{t.privacy}</button><button>{t.support}</button><span className="auth-foot-spacer" /><span>{language.toUpperCase()} · CH</span></footer></main>
}

function PlaceholderPage({ page, t }) {
  const label = page === 'settings' ? t.settings : t.activity
  return <main className="main-content placeholder-page"><span className="placeholder-icon"><Icon name={page === 'settings' ? 'settings' : 'activity'} size={24} /></span><p className="eyebrow">{t.navLabel}</p><h1>{label}</h1><p>{t.placeholderSubtitle}</p></main>
}

export default function App() {
  const [page, setPage] = useState('home')
  const [language, setLanguage] = useState('fr')
  const [authMode, setAuthMode] = useState(null)
  const [servers, setServers] = useState(initialServers)
  const [selected, setSelected] = useState(null)
  const [stage, setStage] = useState('idle')
  const [analyzedUrl, setAnalyzedUrl] = useState('')
  const [toast, setToast] = useState('')
  const t = translations[language]

  function beginNew() { setPage('home'); setStage('idle'); setSelected(null); window.setTimeout(() => document.getElementById('site-url')?.focus(), 50) }
  function updateServer(server) { setServers(current => current.map(item => item.id === server.id ? { ...item, updated: 'À l’instant' } : item)); setToast(language === 'fr' ? 'MCP actualisé' : 'MCP updated'); window.setTimeout(() => setToast(''), 2400) }
  function completeAuth() { setAuthMode(null); setToast(language === 'fr' ? 'Espace de travail prêt' : 'Workspace ready'); window.setTimeout(() => setToast(''), 2400) }

  if (authMode) return <AuthPage mode={authMode} setMode={setAuthMode} t={t} language={language} setLanguage={setLanguage} onComplete={completeAuth} />

  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage} t={t} onNew={beginNew} language={language} setLanguage={setLanguage} onAuth={setAuthMode} />
    <div className="main-column">
      {page === 'home' && <Home t={t} language={language} servers={servers} onSelect={setSelected} onViewAll={() => setPage('servers')} onAnalyze={setAnalyzedUrl} stage={stage} analyzedUrl={analyzedUrl} setStage={setStage} />}
      {page === 'servers' && <ServersPage t={t} language={language} servers={servers} onSelect={setSelected} onNew={beginNew} />}
      {page === 'activity' && <ActivityPage t={t} language={language} servers={servers} onSelect={setSelected} />}
      {page === 'settings' && <PlaceholderPage page={page} t={t} />}
      <footer className="app-footer"><span>MCPEX <i /> {t.footerTag}</span><span>{t.footerLanguage} <i /> <a href="#privacy">{t.privacy}</a> <i /> <a href="#support">{t.support}</a></span></footer>
    </div>
    {selected && <DetailPanel key={selected.id} server={selected} t={t} language={language} onClose={() => setSelected(null)} onUpdate={() => updateServer(selected)} onReconnect={() => { setToast(t.reconnectBackend); window.setTimeout(() => setToast(''), 2600) }} />}
    {toast && <div className="toast"><Icon name="check" size={16} />{toast}</div>}
  </div>
}
