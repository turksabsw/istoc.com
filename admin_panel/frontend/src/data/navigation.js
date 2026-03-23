// ======================================================
// TradeHub B2B - Navigation Data
// Only includes currently existing DocTypes
// New modules will be added as DocTypes are created
// ======================================================

export const railSections = [
  { id: 'dashboard', icon: 'house', label: 'Ana Sayfa' },
  { id: 'management', icon: 'users', label: 'Yönetim' },
]

export const sectionTitles = {
  dashboard: 'Genel Bakış',
  management: 'Kullanıcı & Satıcı Yönetimi',
}

/**
 * panelSections: Each section has groups of menu items
 * Structure: { sectionId: [ { title, items: [{ label, icon, doctype?, route? }] } ] }
 */
export const panelSections = {
  dashboard: [
    {
      title: null,
      color: '#7c3aed',
      items: [
        { label: 'Genel Bakış', icon: 'layout-grid', route: '/dashboard' },
      ],
    },
  ],

  management: [
    {
      title: 'Satıcı Yönetimi',
      color: '#f59e0b',
      items: [
        { label: 'Satıcı Başvuruları', icon: 'file-text', doctype: 'Seller Application' },
        { label: 'Satıcı Profilleri', icon: 'store', doctype: 'Seller Profile' },
      ],
    },
    {
      title: 'Alıcı Yönetimi',
      color: '#3b82f6',
      items: [
        { label: 'Alıcı Profilleri', icon: 'user', doctype: 'Buyer Profile' },
      ],
    },
    {
      title: 'Kullanıcılar',
      color: '#10b981',
      items: [
        { label: 'Kullanıcılar', icon: 'users', doctype: 'User' },
      ],
    },
  ],
}

// ── Helper functions used by components ──

/** Flat search index for GlobalSearch component */
export const searchData = Object.entries(panelSections).flatMap(([sectionId, groups]) =>
  groups.flatMap(group =>
    group.items.map(item => ({
      label: item.label,
      icon: item.icon,
      section: sectionId,
      sectionLabel: sectionTitles[sectionId] || sectionId,
      route: item.route || (item.doctype ? `/app/${encodeURIComponent(item.doctype)}` : null),
      doctype: item.doctype || null,
    }))
  )
)

/** Lookup a navigation item by route, doctype, or report */
export function lookupNavItem(value, type = 'route') {
  for (const [sectionId, groups] of Object.entries(panelSections)) {
    for (const group of groups) {
      for (const item of group.items) {
        if (type === 'route' && item.route === value) {
          return { ...item, section: sectionId, sectionTitle: sectionTitles[sectionId] }
        }
        if (type === 'doctype' && item.doctype === value) {
          return { ...item, section: sectionId, sectionTitle: sectionTitles[sectionId] }
        }
        if (type === 'report' && item.report === value) {
          return { ...item, section: sectionId, sectionTitle: sectionTitles[sectionId] }
        }
      }
    }
  }
  return null
}

/** Get the first navigable route for a given section */
export function getFirstSectionRoute(sectionId) {
  const groups = panelSections[sectionId]
  if (!groups) return '/dashboard'
  for (const group of groups) {
    for (const item of group.items) {
      if (item.route) return item.route
      if (item.doctype) return `/app/${encodeURIComponent(item.doctype)}`
    }
  }
  return '/dashboard'
}
