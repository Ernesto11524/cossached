// One-shot backfill — creates every auto-group and adds every active member
// to the appropriate ones. Safe to re-run.
//
// Run from server/ :
//   node scripts/backfill-groups.mjs

import { backfillAllGroups } from '../src/lib/auto-groups.js'
import { prisma } from '../src/lib/prisma.js'

const main = async () => {
  console.log('Backfilling groups…\n')
  await backfillAllGroups()

  const convs = await prisma.conversation.findMany({
    where:   { kind: { not: null } },
    include: { _count: { select: { participants: true } } },
    orderBy: [{ kind: 'asc' }, { region: 'asc' }],
  })

  const groupBy = {
    NATIONAL:             '🇬🇭 National',
    REGIONAL:             '📍 Regional',
    ALL_EXECUTIVES:       '⭐ All Executives',
    NATIONAL_EXECUTIVES:  '⭐ National Executives',
    REGIONAL_EXECUTIVES:  '⭐ Regional Executives',
  }

  console.log('=== Groups now in place ===')
  for (const kind of Object.keys(groupBy)) {
    const inKind = convs.filter(c => c.kind === kind)
    if (!inKind.length) continue
    console.log(`\n${groupBy[kind]}:`)
    for (const c of inKind) {
      const label = c.region || c.name
      console.log(`  ${label.padEnd(22)} → ${c._count.participants} member(s)`)
    }
  }
  console.log(`\nTotal: ${convs.length} auto-groups.`)
  console.log('Done.')
}

main()
  .catch(e => { console.error('Backfill failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
