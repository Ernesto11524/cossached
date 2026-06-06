// Ghana's 16 administrative regions (used for regional COSSA-CHED executives)
export const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Western North',
  'Central',
  'Eastern',
  'Volta',
  'Oti',
  'Northern',
  'Savannah',
  'North East',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
]

// Order used to rank executive officers within a scope (National or per-Region).
// Lower index = higher rank = appears earlier in the listing.
export const POSITION_RANK = [
  'president',
  'vice',
  'secretary',
  'treasurer',
  'pro',                  // Public Relations Officer
  'welfare',
  'organising secretary',
  'organizing secretary',
  'organiser',
  'organizer',
  'financial secretary',
  'assistant',
  'committee',
]

export function positionRank(position) {
  const p = (position || '').toLowerCase()
  if (!p) return 999
  const ix = POSITION_RANK.findIndex(k => p.includes(k))
  return ix === -1 ? 999 : ix
}

export const isPresident = (m) => {
  const p = (m.position || '').toLowerCase()
  return p.includes('president') && !p.includes('vice')
}
