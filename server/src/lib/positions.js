// Canonical executive positions for COSSA-CHED.
// Mirrors client/src/data/positions.js — keep these two files in sync.

export const NATIONAL_POSITIONS = [
  'Chairman',
  'Vice Chairman',
  'General Secretary',
  'Financial Secretary',
  '1st Trustee',
  '2nd Trustee',
]

export const REGIONAL_POSITIONS = [
  'Regional Chairman',
  'Regional Vice Chairman',
  'Regional General Secretary',
  'Regional Financial Secretary',
  'Regional 1st Trustee',
  'Regional 2nd Trustee',
]

export const ALL_EXECUTIVE_POSITIONS = [...NATIONAL_POSITIONS, ...REGIONAL_POSITIONS]

export function scopeOfPosition(position) {
  if (NATIONAL_POSITIONS.includes(position)) return 'NATIONAL'
  if (REGIONAL_POSITIONS.includes(position)) return 'REGIONAL'
  return null
}
