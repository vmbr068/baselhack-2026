import React from 'react'

export function AdobeLogo({ width = 102, height = 26, className = '' }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 66.25 16.75"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Adobe"
      className={className}
      style={{ display: 'block' }}
    >
      <path
        fill="#eb1000"
        d="m9.057 5.43-2.988 7.423h3.593l1.258 3.593H.025L6.794.272h4.711l6.747 16.174h-4.794Zm49.586 3.694.021-.082c.041-.161.091-.306.146-.431.2-.445.462-.78.781-.995.321-.216.679-.326 1.063-.326.336 0 .66.086.964.253.304.168.563.431.771.782.119.203.203.446.248.722l.014.077zm7.11-1.542c-.157-.355-.342-.685-.553-.986-.211-.302-.45-.576-.713-.821-.527-.488-1.131-.864-1.796-1.116-.664-.252-1.365-.38-2.084-.38-1.055 0-2.039.252-2.926.749-.886.496-1.606 1.209-2.141 2.119-.535.909-.807 1.999-.807 3.239 0 .98.179 1.868.53 2.639.351.772.843 1.43 1.462 1.957.619.528 1.345.936 2.156 1.211.812.276 1.706.416 2.658.416.689 0 1.374-.077 2.035-.231.646-.15 1.271-.377 1.859-.674V12.54c-.603.274-1.185.492-1.733.647-.578.164-1.179.248-1.789.248-.658 0-1.243-.112-1.739-.332-.498-.222-.901-.563-1.194-1.015-.089-.137-.167-.294-.233-.467l-.034-.091h7.425c.014-.205.032-.43.054-.684.023-.26.035-.526.035-.787 0-.933-.159-1.766-.472-2.477m-16.17 4.399c-.123.206-.266.388-.428.547-.162.157-.343.29-.541.398-.397.213-.823.322-1.267.322-.258 0-.522-.034-.785-.101l-.05-.013v-5.34l.051-.012c.282-.064.584-.096.9-.096.444 0 .858.096 1.231.287.375.191.681.491.913.889.229.397.346.91.346 1.524 0 .646-.125 1.183-.37 1.595m3.819-4.329c-.329-.756-.782-1.391-1.347-1.887s-1.196-.868-1.876-1.105c-.681-.238-1.383-.358-2.086-.358-.537 0-1.041.056-1.499.165l-.082.02V.094h-4.037v15.584c.725.329 1.484.576 2.253.734.785.162 1.65.244 2.573.244.826 0 1.646-.136 2.436-.404.788-.268 1.505-.671 2.133-1.199.626-.527 1.127-1.19 1.485-1.969.359-.78.542-1.703.542-2.745 0-1.026-.167-1.931-.495-2.687M37.37 11.999c-.1.206-.215.388-.346.543-.131.154-.276.281-.436.382-.32.199-.677.301-1.061.301-.383 0-.74-.102-1.06-.301-.321-.201-.583-.511-.782-.925-.198-.41-.297-.937-.297-1.567 0-.644.099-1.175.297-1.578.199-.406.461-.713.782-.913.32-.199.677-.301 1.06-.301.384 0 .74.102 1.061.301.32.2.583.507.782.913.197.404.298.935.298 1.578 0 .629-.101 1.156-.298 1.567m3.412-4.957c-.55-.917-1.293-1.621-2.21-2.095-.46-.237-.945-.415-1.453-.535-.509-.119-1.04-.18-1.592-.18-1.101 0-2.126.241-3.044.715-.917.474-1.664 1.178-2.222 2.096-.558.916-.84 2.056-.84 3.389 0 1.333.282 2.474.84 3.39.558.917 1.306 1.626 2.222 2.108.918.482 1.942.726 3.044.726 1.087 0 2.107-.244 3.033-.726.924-.482 1.672-1.191 2.222-2.107.55-.917.829-2.058.829-3.391 0-1.333-.279-2.473-.829-3.39m-16.239 6.071-.051.013c-.284.066-.578.099-.878.099-.428 0-.838-.101-1.218-.299-.383-.199-.694-.506-.925-.911-.229-.405-.346-.929-.346-1.559 0-.645.112-1.181.334-1.593.223-.415.535-.722.927-.913.387-.191.824-.287 1.299-.287.275 0 .547.032.807.095l.051.013zm0-13.019v4.31l-.079-.015c-.38-.073-.776-.11-1.175-.11-.765 0-1.527.131-2.261.392-.734.26-1.396.659-1.97 1.186-.572.528-1.042 1.183-1.393 1.948-.352.763-.53 1.663-.53 2.674 0 1.072.193 2.01.575 2.789.382.78.89 1.427 1.508 1.924.62.497 1.325.869 2.098 1.106.775.237 1.564.358 2.345.358.953 0 1.834-.086 2.619-.255.769-.166 1.535-.417 2.276-.746V.094Z"
      />
    </svg>
  )
}

export function IconPlus({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function IconHome({ size = 22, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v6H4a1 1 0 0 1-1-1V10.5z" />
    </svg>
  )
}

export function IconServers({ size = 22, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <line x1="6" y1="7" x2="13" y2="7" />
      <circle cx="17.5" cy="7" r="0.75" fill="currentColor" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
      <line x1="6" y1="17" x2="13" y2="17" />
      <circle cx="17.5" cy="17" r="0.75" fill="currentColor" />
    </svg>
  )
}

export function IconCollapse({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M14 9l3 3-3 3" />
    </svg>
  )
}

export function IconHelp({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function IconBell({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function IconGrid({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="5" cy="5" r="1.8" />
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="19" cy="5" r="1.8" />
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
      <circle cx="5" cy="19" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
      <circle cx="19" cy="19" r="1.8" />
    </svg>
  )
}

export function IconUser({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function IconMoon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export function IconSun({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

export function IconCopy({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function IconCheck({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function IconExternalLink({ size = 14, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export function IconClose({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function IconSearch({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function IconRefresh({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

export function IconGlobe({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export function IconLightning({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export function IconShield({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

export function IconLock({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
