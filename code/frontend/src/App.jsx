import { useEffect, useMemo, useState } from 'react'
import {
  enrichMcpWithGithub,
  enrichMcpWithWordpress,
  generateMcp,
  generateMcpInteractive,
  getMcpServer,
  listMcpServers,
  loginBusinessOwner,
  registerBusinessOwner,
  getCurrentUser,
  logoutBusinessOwner,
  setAuthToken,
  getAuthToken,
} from './api'
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

const palette = ['violet', 'orange', 'green', 'blue']
function normalizeServer(server, index = 0) {
  const name = server.hotelName || server.name || server.targetUrl || 'MCP'
  const url = server.targetUrl || server.url || ''
  const source = server.codebaseEnrichment?.source === 'github' ? 'GitHub' : server.codebaseEnrichment?.source === 'wordpress' ? 'WordPress' : 'Website'
  const date = server.codebaseEnrichment?.enrichedAt || server.createdAt
  return { ...server, id: server.serverId || server.id, serverId: server.serverId || server.id, name, url, source, status: 'active', routes: server.tools?.length || 0, updated: date ? new Date(date).toLocaleString() : '—', color: palette[index % palette.length], initials: name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(), tools: server.tools || [], scanSummary: server.scanSummary || {}, codebaseEnrichment: server.codebaseEnrichment }
}

function buildActivity(servers) {
  return servers.flatMap(server => [
    ...(server.createdAt ? [{ id: `${server.id}-created`, serverId: server.id, type: 'change', at: server.createdAt, title: 'eventMcpCreated', description: 'eventMcpCreatedDescription' }] : []),
    ...(server.codebaseEnrichment?.enrichedAt ? [{ id: `${server.id}-enriched`, serverId: server.id, type: 'change', at: server.codebaseEnrichment.enrichedAt, title: 'eventMcpEnriched', description: 'eventMcpEnrichedDescription' }] : []),
  ]).sort((a, b) => new Date(b.at) - new Date(a.at))
}

const translations = {
  fr: {
    home: 'Accueil', servers: 'Mes MCP', activity: 'Activité', settings: 'Paramètres', help: 'Besoin d’aide ?', logout: 'Se déconnecter', loading: 'Chargement…',
    welcome: 'Bonjour, Alex', heading: 'Que souhaitez-vous connecter ?', subheading: 'Décrivez votre projet. MCPEX analyse votre site et vous guide pour créer un MCP.', generatedTitle: 'Votre MCP est généré', generatedSubtitle: 'Le MCP de base est prêt à être utilisé. Vous pouvez ajouter le code source pour enrichir ses routes.', enrichPrompt: 'Le MCP de base est prêt. Ajoutez l’accès au code pour enrichir les outils et les routes détectés.', codeSource: 'Source du code', repoUrl: 'URL du dépôt GitHub', branch: 'Branche', githubToken: 'Jeton GitHub (si privé)', optionalToken: 'Facultatif pour un dépôt public', wordpressUrl: 'URL WordPress (facultatif)', enrichButton: 'Enrichir le MCP', enriching: 'Enrichissement…',
    urlLabel: 'URL de votre site', placeholder: 'https://votre-site.com', analyze: 'Analyser le site', secure: 'Vos données restent privées et sécurisées',
    loginPrompt: 'Ce site nécessite une connexion (espace membre, compte)', loginAndAnalyze: 'Se connecter & Analyser', loggingIn: 'Connexion en cours…', loginWindowHelp: 'Une fenêtre s’ouvre pour vous connecter au site. Elle se fermera automatiquement dès la connexion réussie.',
    recent: 'Récemment consultés', seeAll: 'Tout voir', active: 'Actif', attention: 'Action requise', routes: 'routes', updated: 'Mis à jour',
    integrations: 'Sources compatibles', github: 'Dépôt GitHub', wordpress: 'WordPress', more: 'Et bien plus',
    mcpTitle: 'Mes MCP', mcpDescription: 'Retrouvez vos connexions, leurs routes et leur état.', search: 'Rechercher un MCP…', all: 'Tous',
    details: 'Voir les routes', update: 'Mettre à jour', empty: 'Aucun MCP trouvé.',
    analyzing: 'Analyse en cours', analysisSub: 'Nous repérons la plateforme de votre site et les accès nécessaires.', step1: 'Connexion au site', step2: 'Détection de la plateforme', step3: 'Préparation des prochaines étapes', done: 'Analyse terminée',
    sourceTitle: 'Votre site est prêt à être connecté', sourceSub: 'Nous avons détecté une application web. Choisissez où se trouve son code pour continuer.', connectGithub: 'Connecter GitHub', connectWordpress: 'Connecter WordPress', otherSource: 'Autre source', restart: 'Analyser une autre URL',
    routesTitle: 'Routes disponibles', close: 'Fermer', account: 'Compte', language: 'Langue', login: 'Connexion', signup: 'Créer un compte', email: 'Adresse e-mail', password: 'Mot de passe', fullName: 'Nom complet', continue: 'Continuer', or: 'ou', noAccount: 'Pas encore de compte ?', hasAccount: 'Déjà un compte ?', welcomeBack: 'Content de vous revoir', createAccount: 'Votre espace de travail commence ici', loginSub: 'Connectez-vous à votre espace MCPEX.', signupSub: 'Créez votre compte professionnel MCPEX.',
    workspace: 'Espace de travail', newMcp: 'Nouveau MCP', workspaceEyebrow: 'VOTRE PASSERELLE VERS LES AGENTS IA', recentDescription: 'Vos projets, au même endroit.', firstStep: 'Étape 1 sur 3', workspaceSecurity: 'Vous gardez le contrôle. Chaque action sensible nécessite votre confirmation.', sourceConnected: 'La connexion est prête à être configurée.', otherSourceNext: 'Vous pourrez sélectionner cette source lors de la prochaine étape.', navLabel: 'ESPACE DE TRAVAIL', footerTag: 'CONÇU POUR LES ÉQUIPES QUI CONSTRUISENT L’AVENIR', footerLanguage: 'FR · CH', placeholderSubtitle: 'Cette section sera bientôt disponible dans votre espace MCPEX.',
    tableProject: 'PROJET', tableSource: 'SOURCE', tableStatus: 'ÉTAT', tableRoutes: 'ROUTES', tableUpdated: 'MISE À JOUR', mcpCount: count => `${count} MCP${count > 1 ? 's' : ''} dans votre espace`, localData: 'Données locales d’exemple', detailEyebrow: 'DÉTAILS DU MCP', activeRoutes: 'ROUTES ACTIVES', lastUpdate: 'DERNIÈRE MISE À JOUR', routeSectionDescription: 'Choisissez les routes exposées à vos agents.', routeDescriptions: ['Lister les produits disponibles', 'Consulter un produit', 'Ajouter un article au panier', 'Consulter les commandes'], safetyConfirm: 'Les réservations et paiements exigent une confirmation humaine.',
    activityDescription: 'Suivez les créations et enrichissements de vos MCP.', activityFilterAll: 'Tout', activityFilterAction: 'Action requise', activityFilterChanges: 'Modifications', activitySearch: 'Rechercher dans l’activité…', activityEmpty: 'Aucun événement ne correspond à ces filtres.', today: 'Aujourd’hui', yesterday: 'Hier', earlier: 'Plus tôt', viewMcp: 'Voir le MCP', activitySample: 'Événements du backend', eventMcpEnriched: 'MCP enrichi', eventMcpEnrichedDescription: 'Les outils ont été enrichis depuis la source de code.', eventMcpCreated: 'MCP créé', eventMcpCreatedDescription: 'Le MCP de base a été généré depuis l’URL du site.', syncFailureTitle: 'Synchronisation en échec', reconnect: 'Reconnecter WordPress', reconnectBackend: 'La reconnexion sera disponible avec le backend.',
    authArtTag: 'ESPACE DE TRAVAIL MCPEX', authArtTitle: <>Connectez vos outils.<br />Libérez vos agents.</>, authArtDescription: 'Une passerelle sécurisée entre votre site web et les outils d’IA de votre équipe.', authTagLogin: 'VOTRE ESPACE DE TRAVAIL', authTagSignup: 'PREMIERS PAS', forgot: 'Mot de passe oublié ?', google: 'Continuer avec Google', legal: <>En continuant, vous acceptez nos <a href="#terms">Conditions d’utilisation</a> et notre <a href="#privacy">Politique de confidentialité</a>.</>, privacy: 'Confidentialité', support: 'Assistance',
    businessOwnerSpace: 'Espace Propriétaire', notSignedIn: 'Non connecté', quickDemoLogin: 'Comptes démo pour le pitch', companyLabel: 'Établissement / Entreprise', companyPlaceholder: 'ex. Grand Hotel Basel', authSuccess: 'Connecté avec succès', authLoggedOut: 'Vous êtes déconnecté',
  },
  en: {
    home: 'Home', servers: 'My MCPs', activity: 'Activity', settings: 'Settings', help: 'Need help?', logout: 'Sign out', loading: 'Loading…',
    welcome: 'Hello, Alex', heading: 'What would you like to connect?', subheading: 'Describe your project. MCPEX analyses your site and guides you through creating an MCP.', generatedTitle: 'Your MCP is ready', generatedSubtitle: 'Your base MCP is ready to use. You can add source code access to enrich its routes.', enrichPrompt: 'Your base MCP is ready. Add source code access to enrich the detected tools and routes.', codeSource: 'Code source', repoUrl: 'GitHub repository URL', branch: 'Branch', githubToken: 'GitHub token (if private)', optionalToken: 'Optional for public repositories', wordpressUrl: 'WordPress URL (optional)', enrichButton: 'Enrich MCP', enriching: 'Enriching…',
    urlLabel: 'Website URL', placeholder: 'https://your-website.com', analyze: 'Analyse website', secure: 'Your data stays private and secure',
    loginPrompt: 'This site requires login (member area, account)', loginAndAnalyze: 'Log in & Analyse', loggingIn: 'Logging in…', loginWindowHelp: 'A window will open for you to log in. It will close automatically upon successful login.',
    recent: 'Recently viewed', seeAll: 'View all', active: 'Active', attention: 'Action required', routes: 'routes', updated: 'Updated',
    integrations: 'Compatible sources', github: 'GitHub repository', wordpress: 'WordPress', more: 'And many more',
    mcpTitle: 'My MCPs', mcpDescription: 'Manage your connections, routes and status.', search: 'Search MCPs…', all: 'All',
    details: 'View routes', update: 'Update', empty: 'No MCPs found.',
    analyzing: 'Analysing website', analysisSub: 'We’re identifying your website platform and the access it needs.', step1: 'Connecting to website', step2: 'Detecting platform', step3: 'Preparing next steps', done: 'Analysis complete',
    sourceTitle: 'Your website is ready to connect', sourceSub: 'We detected a web application. Choose where its code lives to continue.', connectGithub: 'Connect GitHub', connectWordpress: 'Connect WordPress', otherSource: 'Another source', restart: 'Analyse another URL',
    routesTitle: 'Available routes', close: 'Close', account: 'Account', language: 'Language', login: 'Sign in', signup: 'Create account', email: 'Email address', password: 'Password', fullName: 'Full name', continue: 'Continue', or: 'or', noAccount: 'New to MCPEX?', hasAccount: 'Already have an account?', welcomeBack: 'Welcome back', createAccount: 'Your workspace starts here', loginSub: 'Sign in to your MCPEX workspace.', signupSub: 'Create your MCPEX business account.',
    workspace: 'Workspace', newMcp: 'New MCP', workspaceEyebrow: 'YOUR BRIDGE TO AI AGENTS', recentDescription: 'Your projects, all in one place.', firstStep: 'Step 1 of 3', workspaceSecurity: 'You stay in control. Sensitive actions always require your confirmation.', sourceConnected: 'Connection is ready to be configured.', otherSourceNext: 'You can select this source in the next step.', navLabel: 'WORKSPACE', footerTag: 'BUILT FOR TEAMS BUILDING WHAT’S NEXT', footerLanguage: 'EN · CH', placeholderSubtitle: 'This section will be available in your MCPEX workspace soon.',
    tableProject: 'PROJECT', tableSource: 'SOURCE', tableStatus: 'STATUS', tableRoutes: 'ROUTES', tableUpdated: 'UPDATED', mcpCount: count => `${count} MCP${count === 1 ? '' : 's'} in your workspace`, localData: 'Local sample data', detailEyebrow: 'MCP DETAILS', activeRoutes: 'ACTIVE ROUTES', lastUpdate: 'LAST UPDATED', routeSectionDescription: 'Choose which routes your agents can access.', routeDescriptions: ['List available products', 'View a product', 'Add an item to the cart', 'View orders'], safetyConfirm: 'Bookings and payments require human confirmation.',
    activityDescription: 'Track MCP creation and enrichment.', activityFilterAll: 'All', activityFilterAction: 'Action required', activityFilterChanges: 'Changes', activitySearch: 'Search activity…', activityEmpty: 'No events match these filters.', today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier', viewMcp: 'View MCP', activitySample: 'Backend events', eventMcpEnriched: 'MCP enriched', eventMcpEnrichedDescription: 'Tools were enriched from the code source.', eventMcpCreated: 'MCP created', eventMcpCreatedDescription: 'A base MCP was generated from the website URL.', syncFailureTitle: 'Sync failed', reconnect: 'Reconnect WordPress', reconnectBackend: 'Reconnection will be available when the backend is connected.',
    authArtTag: 'MCPEX / WORKSPACE', authArtTitle: <>Connect your tools.<br />Unlock your agents.</>, authArtDescription: 'One secure bridge between your website and the AI tools your team uses every day.', authTagLogin: 'YOUR WORKSPACE', authTagSignup: 'GET STARTED', forgot: 'Forgot password?', google: 'Continue with Google', legal: <>By continuing, you agree to our <a href="#terms">Terms of Use</a> and <a href="#privacy">Privacy Policy</a>.</>, privacy: 'Privacy', support: 'Support',
    businessOwnerSpace: 'Business Owner', notSignedIn: 'Not signed in', quickDemoLogin: 'Demo accounts for pitch', companyLabel: 'Property / Business name', companyPlaceholder: 'e.g. Grand Hotel Basel', authSuccess: 'Signed in successfully', authLoggedOut: 'You have been signed out',
  },

}

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

function Sidebar({ page, setPage, t, onNew, language, setLanguage, onAuth, onLogout, currentUser, servers }) {
  const initials = currentUser?.fullName
    ? currentUser.fullName.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : 'BO'

  return <aside className="sidebar">
    <div className="sidebar-top"><Wordmark /><button className="icon-button mobile-close" aria-label="Fermer le menu" onClick={() => setPage('home')}><Icon name="close" /></button></div>
    <button className="new-button" onClick={onNew}><Icon name="plus" size={18} /><span>{t.newMcp}</span><span className="shortcut">⌘ K</span></button>
    <div className="nav-section-label">{t.navLabel}</div>
    <nav className="main-nav" aria-label="Navigation principale">
      <button className={page === 'home' ? 'nav-item selected' : 'nav-item'} onClick={() => setPage('home')}><Icon name="home" /><span>{t.home}</span></button>
      <button className={page === 'servers' ? 'nav-item selected' : 'nav-item'} onClick={() => setPage('servers')}><Icon name="cube" /><span>{t.servers}</span><span className="nav-count">{servers.length}</span></button>
      <button className={page === 'activity' ? 'nav-item selected' : 'nav-item'} onClick={() => setPage('activity')}><Icon name="activity" /><span>{t.activity}</span></button>
    </nav>
    <div className="sidebar-spacer" />
    <div className="sidebar-bottom">
      <button className="nav-item" onClick={() => setPage('settings')}><Icon name="settings" /><span>{t.settings}</span></button>
      <button className="nav-item help-item"><Icon name="help" /><span>{t.help}</span><Icon name="external" size={15} /></button>
      <div className="sidebar-divider" />
      {currentUser ? (
        <div className="account-card">
          <span className="account-avatar">{initials}</span>
          <span className="account-copy">
            <strong>{currentUser.fullName}</strong>
            <span>{currentUser.company || currentUser.email}</span>
          </span>
          <button
            className="icon-button"
            aria-label={t.logout}
            title={t.logout}
            onClick={onLogout}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      ) : (
        <div className="account-card unauthenticated">
          <span className="account-avatar" style={{ background: '#f0f0f3', color: '#666' }}>
            <Icon name="lock" size={15} />
          </span>
          <span className="account-copy">
            <strong>{t.businessOwnerSpace}</strong>
            <span>{t.notSignedIn}</span>
          </span>
          <button
            className="quiet-button compact"
            style={{ fontWeight: 600, color: 'var(--blue)' }}
            onClick={() => onAuth('login')}
          >
            {t.login}
          </button>
        </div>
      )}
      <button className="language-switch" onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}><Icon name="globe" size={16} /><span>{t.language}</span><strong>{language.toUpperCase()}</strong></button>
    </div>
  </aside>
}


function Home({ t, language, servers, onSelect, onViewAll, onAnalyze, stage, analyzedUrl, setStage, generated, needsEnrichment, busy, error, onEnrich }) {
  const [url, setUrl] = useState('')
  const [needsAuth, setNeedsAuth] = useState(false)
  const [source, setSource] = useState('github')
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [token, setToken] = useState('')
  const [wpUrl, setWpUrl] = useState('')
  function submit(event) {
    event.preventDefault()
    if (url.trim()) onAnalyze(url.trim(), needsAuth)
  }
  return <main className="main-content home-content">
    <div className="home-toolbar"><span className="breadcrumb">{t.workspace} <span>/</span> {t.home}</span><button className="quiet-button"><Icon name="help" size={17} />{language === 'fr' ? 'Guide de démarrage' : 'Getting started'}</button></div>
    {stage === 'result' ? <section className="analysis-result panel-in">
      <span className="result-icon"><Icon name="check" size={24} /></span><p className="eyebrow">{t.done}</p><h1>{t.generatedTitle}</h1><p className="result-url"><Icon name="globe" size={15} /> {analyzedUrl}</p>
      <p className="result-subtitle">{needsEnrichment ? t.enrichPrompt : t.generatedSubtitle}</p>
      <div className="generated-tools"><strong>{generated?.tools?.length || 0} {t.routes}</strong>{(generated?.tools || []).map(tool => <span key={tool.name}><code>{tool.name}</code>{tool.description}</span>)}</div>
      {needsEnrichment && <form className="enrich-form" onSubmit={event => { event.preventDefault(); onEnrich(source, { repoUrl, branch, githubToken: token, wpUrl }); setToken('') }}>
        <label>{t.codeSource}<select value={source} onChange={event => setSource(event.target.value)}><option value="github">GitHub</option><option value="wordpress">WordPress</option></select></label>
        {source === 'github' ? <><label>{t.repoUrl}<input type="url" placeholder="https://github.com/organisation/projet" value={repoUrl} onChange={event => setRepoUrl(event.target.value)} required /></label><div className="enrich-fields"><label>{t.branch}<input value={branch} onChange={event => setBranch(event.target.value)} /></label><label>{t.githubToken}<input type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} placeholder={t.optionalToken} /></label></div></> : <label>{t.wordpressUrl}<input type="url" value={wpUrl} onChange={event => setWpUrl(event.target.value)} placeholder={analyzedUrl} /></label>}
        <button className="primary-button" type="submit" disabled={busy}>{busy ? t.enriching : t.enrichButton}<Icon name="arrow" size={16} /></button>
      </form>}
      {error && <div className="api-error" role="alert">{error}</div>}
      <button className="text-button back-link" onClick={() => { setStage('idle'); setUrl('') }}>← {t.restart}</button>
    </section> : <>
      <section className="hero-section">
        <div className="hero-spark"><Icon name="spark" size={22} /></div>
        <p className="eyebrow">{t.workspaceEyebrow}</p>
        <h1>{t.heading}</h1>
        <p className="hero-subtitle">{t.subheading}</p>
        <form className={`url-composer ${stage === 'analyzing' ? 'is-loading' : ''}`} onSubmit={submit}>
          {stage === 'analyzing' ? <div className="loading-view"><span className="spinner" /><div><strong>{needsAuth ? t.loggingIn : t.analyzing}</strong><span>{analyzedUrl}</span>{needsAuth && <p style={{ fontSize: '0.82rem', color: '#2563eb', marginTop: '0.35rem' }}>{t.loginWindowHelp}</p>}</div></div> : <>
            <label htmlFor="site-url">{t.urlLabel}</label>
            <div className="url-input-row"><Icon name="globe" size={19} /><input id="site-url" type="url" placeholder={t.placeholder} value={url} onChange={e => setUrl(e.target.value)} required /><button className="primary-button" type="submit" disabled={busy}>{needsAuth ? <><Icon name="lock" size={16} /> {busy ? t.loggingIn : t.loginAndAnalyze}</> : <>{busy ? t.analyzing : t.analyze}<Icon name="arrow" size={16} /></>}</button></div>
            <div style={{ margin: '0.6rem 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={needsAuth} onChange={e => setNeedsAuth(e.target.checked)} style={{ cursor: 'pointer', accentColor: '#1e3a8a' }} />
                <span>{t.loginPrompt}</span>
              </label>
            </div>
            <div className="composer-footer"><span><Icon name="lock" size={14} /> {t.secure}</span><span>{t.firstStep}</span></div>
          </>}
          {stage === 'analyzing' && <div className="analysis-steps"><span className="step-done"><Icon name="check" size={14} /> {t.step1}</span><span className="step-current"><i /> {t.step2}</span><span>{t.step3}</span></div>}
        </form>
        {error && <div className="api-error" role="alert">{error}</div>}
        <div className="integration-row"><span>{t.integrations}</span><span className="integration-chip"><SourceMark source="GitHub" />{t.github}</span><span className="integration-chip"><SourceMark source="WordPress" />{t.wordpress}</span><span className="integration-more">{t.more}</span></div>
      </section>
      <section className="recent-section"><div className="section-heading"><div><h2>{t.recent}</h2><p>{t.recentDescription}</p></div><button className="text-button" onClick={onViewAll}>{t.seeAll}<Icon name="arrow" size={15} /></button></div><div className="server-list">{servers.slice(0, 2).map(server => <ServerCard key={server.id} server={server} t={t} language={language} onSelect={onSelect} />)}</div></section>
      <div className="home-footnote"><span className="footnote-icon"><Icon name="lock" size={14} /></span><span>{t.workspaceSecurity}</span><button className="icon-button" aria-label={t.help}><Icon name="external" size={14} /></button></div>
    </>}
  </main>
}

function ServersPage({ t, language, servers, onSelect, onNew, loading }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => servers.filter(s => `${s.name} ${s.url} ${s.source}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || s.status === filter)), [servers, query, filter])
  return <main className="main-content list-page"><div className="page-toolbar"><span className="breadcrumb">{t.workspace} <span>/</span> {t.servers}</span></div>
    <div className="page-heading-row"><div><p className="eyebrow">{language === 'fr' ? 'VOTRE ESPACE' : 'YOUR WORKSPACE'}</p><h1>{t.mcpTitle}</h1><p>{t.mcpDescription}</p></div><button className="primary-button" onClick={onNew}><Icon name="plus" size={17} /> {t.newMcp}</button></div>
    <div className="list-controls"><div className="search-field"><Icon name="search" size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search} /></div><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t.all}<span>{servers.length}</span></button><button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>{t.active}<span>{servers.filter(s => s.status === 'active').length}</span></button><button className={filter === 'attention' ? 'active' : ''} onClick={() => setFilter('attention')}>{t.attention}<span>0</span></button></div></div>
    <div className="server-table-wrap"><table className="server-table"><thead><tr><th>{t.tableProject}</th><th>{t.tableSource}</th><th>{t.tableStatus}</th><th>{t.tableRoutes}</th><th>{t.tableUpdated}</th><th /></tr></thead><tbody>{filtered.map(server => <tr key={server.id} onClick={() => onSelect(server)}><td><span className={`server-avatar small ${server.color}`}>{server.initials}</span><span className="table-name"><strong>{server.name}</strong><small>{server.url}</small></span></td><td><span className="table-source"><SourceMark source={server.source} />{server.source}</span></td><td><Status status={server.status} t={t} /></td><td>{server.routes}</td><td>{formatUpdated(server.updated, language)}</td><td><button className="icon-button row-action" aria-label={t.details}><Icon name="arrow" size={16} /></button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state">{loading ? t.loading : t.empty}</div>}</div>
    <div className="table-foot">{t.mcpCount(filtered.length)}</div>
  </main>
}

function DetailPanel({ server, t, language, onClose, onUpdate }) {
  const tools = server.tools || []
  return <div className="drawer-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><aside className="detail-drawer" aria-label={server.name}>
    <div className="drawer-header"><span className="eyebrow">{t.detailEyebrow}</span><button className="icon-button" onClick={onClose} aria-label={t.close}><Icon name="close" /></button></div>
    <div className="drawer-project"><span className={`server-avatar ${server.color}`}>{server.initials}</span><div><h2>{server.name}</h2><a href={server.url} target="_blank" rel="noreferrer">{server.url}<Icon name="external" size={13} /></a></div><Status status={server.status} t={t} /></div>
    <div className="detail-metrics"><div><span>{t.activeRoutes}</span><strong>{tools.length}</strong></div><div><span>{t.lastUpdate}</span><strong>{formatUpdated(server.updated, language)}</strong></div></div>
    <div className="routes-heading"><div><h3>{t.routesTitle}</h3><p>{t.routeSectionDescription}</p></div><button className="quiet-button compact" onClick={onUpdate}><Icon name="refresh" size={14} /> {t.update}</button></div>
    <div className="route-list">{tools.map(tool => { const method = tool.apiMethod || 'MCP'; const path = tool.apiEndpoint ? new URL(tool.apiEndpoint, server.url).pathname : `/${tool.name}`; return <div className="route-row" key={tool.name}><div className={`method method-${method.toLowerCase()}`}>{method}</div><div className="route-copy"><code>{path}</code><span>{tool.description}</span><small>{tool.name}</small></div></div> })}{tools.length === 0 && <div className="empty-state">{t.empty}</div>}</div>
    <div className="drawer-bottom"><div className="privacy-note"><Icon name="lock" size={16} /><span>{t.safetyConfirm}</span></div><button className="secondary-button full-width" onClick={onUpdate}><Icon name="refresh" size={15} /> {t.update}</button></div>
  </aside></div>
}

function ActivityPage({ t, language, servers, onSelect }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const events = buildActivity(servers)
  const matchingEvents = events.filter(event => {
    const server = servers.find(item => item.id === event.serverId)
    const matchesFilter = filter === 'all' || event.type === filter
    const content = `${server?.name || ''} ${server?.source || ''} ${t[event.title]} ${t[event.description]}`.toLowerCase()
    return matchesFilter && content.includes(query.toLowerCase())
  })
  const iconFor = () => 'plus'
  const groupFor = event => new Date(event.at).toDateString() === new Date().toDateString() ? 'today' : (Date.now() - new Date(event.at).getTime() < 86400000 * 2 ? 'yesterday' : 'earlier')

  return <main className="main-content activity-page">
    <div className="page-toolbar"><span className="breadcrumb">{t.workspace} <span>/</span> {t.activity}</span></div>
    <div className="page-heading-row"><div><p className="eyebrow">{language === 'fr' ? 'JOURNAL DU WORKSPACE' : 'WORKSPACE LOG'}</p><h1>{t.activity}</h1><p>{t.activityDescription}</p></div></div>
    <div className="activity-controls"><div className="search-field"><Icon name="search" size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.activitySearch} /></div><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t.activityFilterAll}<span>{events.length}</span></button><button className={filter === 'change' ? 'active' : ''} onClick={() => setFilter('change')}>{t.activityFilterChanges}<span>{events.length}</span></button></div></div>
    {['today', 'yesterday', 'earlier'].map(group => {
      const groupEvents = matchingEvents.filter(event => groupFor(event) === group)
      if (!groupEvents.length) return null
      return <section className="activity-group" key={group}><h2>{t[group]}</h2><div className="activity-timeline">{groupEvents.map(event => {
        const server = servers.find(item => item.id === event.serverId)
        return <article className={`activity-event ${event.type === 'action' ? 'event-action' : ''}`} key={event.id}>
          <div className="activity-event-icon"><Icon name={iconFor(event)} size={17} /></div>
          <div className="activity-event-main"><div className="activity-event-heading"><div><strong>{t[event.title]}</strong><span className="event-project">{server?.name}</span></div><time>{new Date(event.at).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}</time></div><p>{t[event.description]}</p><div className="activity-event-footer"><span className="event-source"><SourceMark source={server?.source || ''} />{server?.source}</span><button className="text-button" onClick={() => onSelect(server)}>{t.viewMcp}<Icon name="arrow" size={14} /></button></div></div>
        </article>
      })}</div></section>
    })}
    {matchingEvents.length === 0 && <div className="empty-state activity-empty">{t.activityEmpty}</div>}
    <div className="table-foot activity-foot"><span>{matchingEvents.length}</span></div>
  </main>
}

function AuthPage({ mode, setMode, t, language, setLanguage, onComplete }) {
  const signup = mode === 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleAuth(event) {
    if (event) event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (signup) {
        const res = await registerBusinessOwner({ email, password, fullName, company })
        setAuthToken(res.token)
        onComplete(res.user)
      } else {
        const res = await loginBusinessOwner(email, password)
        setAuthToken(res.token)
        onComplete(res.user)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function useDemoAccount(demoEmail, demoPassword) {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError('')
    setBusy(true)
    loginBusinessOwner(demoEmail, demoPassword)
      .then(res => {
        setAuthToken(res.token)
        onComplete(res.user)
      })
      .catch(err => setError(err.message))
      .finally(() => setBusy(false))
  }

  return <main className="auth-shell">
    <div className="auth-top">
      <Wordmark />
      <div className="auth-actions">
        <button className="quiet-button language-auth" onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}>
          <Icon name="globe" size={15} />{language.toUpperCase()}
        </button>
        <button className="quiet-button" onClick={() => { setMode(signup ? 'login' : 'signup'); setError('') }}>
          {signup ? t.hasAccount : t.noAccount}
          <strong>{signup ? t.login : t.signup}</strong>
        </button>
      </div>
    </div>
    <div className="auth-content">
      <div className="auth-art">
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
        <div className="art-core"><Icon name="spark" size={36} /></div>
        <span className="art-node node-one"><Icon name="globe" /></span>
        <span className="art-node node-two"><Icon name="cube" /></span>
        <span className="art-node node-three"><Icon name="check" /></span>
        <div className="art-caption">
          <span>{t.authArtTag}</span>
          <strong>{t.authArtTitle}</strong>
          <p>{t.authArtDescription}</p>
        </div>
      </div>
      <section className="auth-form-side">
        <p className="eyebrow">{signup ? t.authTagSignup : t.authTagLogin}</p>
        <h1>{signup ? t.createAccount : t.welcomeBack}</h1>
        <p>{signup ? t.signupSub : t.loginSub}</p>

        {!signup && (
          <div style={{ marginBottom: '16px', padding: '10px 12px', background: '#f8f8fa', border: '1px solid #e7e7eb', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#666', marginBottom: '6px' }}>
              ⚡ {t.quickDemoLogin}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <button
                type="button"
                className="quiet-button compact"
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '5px 8px', background: '#fff', border: '1px solid #d5d5db', borderRadius: '5px', fontSize: '10px' }}
                onClick={() => useDemoAccount('owner@hotelbasel.ch', 'basel2026')}
              >
                🏨 <strong>Beatrix Meier</strong> — Grand Hotel Basel
              </button>
              <button
                type="button"
                className="quiet-button compact"
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '5px 8px', background: '#fff', border: '1px solid #d5d5db', borderRadius: '5px', fontSize: '10px' }}
                onClick={() => useDemoAccount('alex@atelier-studio.ch', 'demo1234')}
              >
                🎨 <strong>Alex Laurent</strong> — Atelier Studio
              </button>
            </div>
          </div>
        )}

        {error && <div className="api-error" role="alert">{error}</div>}

        <form onSubmit={handleAuth}>
          {signup && <>
            <label>{t.fullName}<input autoComplete="name" placeholder="Beatrix Meier" value={fullName} onChange={e => setFullName(e.target.value)} required /></label>
            <label>{t.companyLabel}<input placeholder={t.companyPlaceholder} value={company} onChange={e => setCompany(e.target.value)} /></label>
          </>}
          <label>{t.email}<input type="email" autoComplete="email" placeholder={language === 'fr' ? 'vous@hotel-basel.ch' : 'you@hotel-basel.ch'} value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label>{t.password}<input type="password" autoComplete={signup ? 'new-password' : 'current-password'} placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required /></label>
          {!signup && <button type="button" className="forgot-link">{t.forgot}</button>}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            {busy ? t.loggingIn : (signup ? t.signup : t.login)}
            <Icon name="arrow" size={16} />
          </button>
        </form>
        <div className="auth-separator"><span />{t.or}<span /></div>
        <button className="sso-button" type="button" onClick={() => useDemoAccount('owner@hotelbasel.ch', 'basel2026')}>
          <span className="google-mark">G</span> {t.google} (Demo)
        </button>
        <div className="auth-legal">{t.legal}</div>
      </section>
    </div>
    <footer className="auth-footer">
      <span>© 2026 MCPEX</span>
      <button>{t.privacy}</button>
      <button>{t.support}</button>
      <span className="auth-foot-spacer" />
      <span>{language.toUpperCase()} · CH</span>
    </footer>
  </main>
}

function PlaceholderPage({ page, t }) {
  const label = page === 'settings' ? t.settings : t.activity
  return <main className="main-content placeholder-page"><span className="placeholder-icon"><Icon name={page === 'settings' ? 'settings' : 'activity'} size={24} /></span><p className="eyebrow">{t.navLabel}</p><h1>{label}</h1><p>{t.placeholderSubtitle}</p></main>
}

export default function App() {
  const [page, setPage] = useState('home')
  const [language, setLanguage] = useState('fr')
  const [authMode, setAuthMode] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [servers, setServers] = useState([])
  const [selected, setSelected] = useState(null)
  const [stage, setStage] = useState('idle')
  const [analyzedUrl, setAnalyzedUrl] = useState('')
  const [generated, setGenerated] = useState(null)
  const [needsEnrichment, setNeedsEnrichment] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loadingServers, setLoadingServers] = useState(true)
  const [toast, setToast] = useState('')
  const t = translations[language]

  async function loadUser() {
    if (getAuthToken()) {
      try {
        const res = await getCurrentUser()
        if (res?.user) setCurrentUser(res.user)
      } catch {
        setAuthToken(null)
        setCurrentUser(null)
      }
    }
  }

  async function refreshServers() {
    setLoadingServers(true)
    try { const result = await listMcpServers(); setServers((result || []).map(normalizeServer)) }
    catch (err) { setError(err.message) }
    finally { setLoadingServers(false) }
  }

  useEffect(() => {
    loadUser()
    refreshServers()
  }, [])

  function beginNew() { setPage('home'); setStage('idle'); setSelected(null); window.setTimeout(() => document.getElementById('site-url')?.focus(), 50) }

  async function analyzeUrl(url, isInteractive = false) {
    setAnalyzedUrl(url); setStage('analyzing'); setBusy(true); setError('')
    try {
      const result = isInteractive
        ? await generateMcpInteractive(url)
        : await generateMcp(url)
      const detail = await getMcpServer(result.server_id)
      const normalized = normalizeServer(detail)
      setGenerated({ ...result, ...detail }); setNeedsEnrichment((detail.scanSummary?.inputsDetected ?? 0) === 0 || (detail.scanSummary?.buttonsDetected ?? 0) === 0)
      setServers(current => [normalized, ...current.filter(item => item.id !== normalized.id)])
      setStage('result')
    } catch (err) { setError(err.message); setStage('idle') }
    finally { setBusy(false) }
  }

  async function enrichServer(source, values) {
    if (!generated?.server_id) return
    setBusy(true); setError('')
    try {
      if (source === 'github') await enrichMcpWithGithub(generated.server_id, values)
      else await enrichMcpWithWordpress(generated.server_id, values.wpUrl)
      const detail = normalizeServer(await getMcpServer(generated.server_id))
      setGenerated(detail); setServers(current => [detail, ...current.filter(item => item.id !== detail.id)])
      setNeedsEnrichment(false); setToast(language === 'fr' ? 'MCP enrichi' : 'MCP enriched'); window.setTimeout(() => setToast(''), 2400)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function selectServer(server) {
    setSelected(server)
    try { setSelected(normalizeServer(await getMcpServer(server.id))) } catch (err) { setError(err.message) }
  }

  async function updateServer(server) {
    try { const refreshed = normalizeServer(await getMcpServer(server.id)); setServers(current => current.map(item => item.id === server.id ? refreshed : item)); setSelected(refreshed) }
    catch (err) { setError(err.message) }
  }

  function handleLogout() {
    logoutBusinessOwner().catch(() => {})
    setAuthToken(null)
    setCurrentUser(null)
    setToast(t.authLoggedOut)
    window.setTimeout(() => setToast(''), 2400)
  }

  function completeAuth(user) {
    if (user) setCurrentUser(user)
    setAuthMode(null)
    setToast(t.authSuccess)
    window.setTimeout(() => setToast(''), 2400)
  }

  if (authMode) return <AuthPage mode={authMode} setMode={setAuthMode} t={t} language={language} setLanguage={setLanguage} onComplete={completeAuth} />

  return <div className="app-shell">
    <Sidebar
      page={page}
      setPage={setPage}
      t={t}
      onNew={beginNew}
      language={language}
      setLanguage={setLanguage}
      onAuth={setAuthMode}
      onLogout={handleLogout}
      currentUser={currentUser}
      servers={servers}
    />
    <div className="main-column">
      {page === 'home' && <Home t={t} language={language} servers={servers} onSelect={selectServer} onViewAll={() => setPage('servers')} onAnalyze={analyzeUrl} stage={stage} analyzedUrl={analyzedUrl} setStage={setStage} generated={generated} needsEnrichment={needsEnrichment} busy={busy} error={error} onEnrich={enrichServer} />}
      {page === 'servers' && <ServersPage t={t} language={language} servers={servers} onSelect={selectServer} onNew={beginNew} loading={loadingServers} />}
      {page === 'activity' && <ActivityPage t={t} language={language} servers={servers} onSelect={selectServer} />}
      {page === 'settings' && <PlaceholderPage page={page} t={t} />}
      <footer className="app-footer"><span>MCPEX <i /> {t.footerTag}</span><span>{t.footerLanguage} <i /> <a href="#privacy">{t.privacy}</a> <i /> <a href="#support">{t.support}</a></span></footer>
    </div>
    {selected && <DetailPanel key={selected.id} server={selected} t={t} language={language} onClose={() => setSelected(null)} onUpdate={() => updateServer(selected)} />}
    {toast && <div className="toast"><Icon name="check" size={16} />{toast}</div>}
  </div>
}

