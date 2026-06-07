// One-shot backfill — creates the national + 16 regional group chats and
// adds every existing active member to the appropriate groups.
//
// Safe to re-run (idempotent).
//
// Run from the server/ directory:
//   node scripts/backfill-groups.mjs

import { backfillAllGroups, GHANA_REGIONS, ensureNationalGroup, ensureRegionalGroup } from '../src/lib/auto-groups.js'
import { prisma } from '../src/lib/prisma.js'

const main = async () => {
  console.log('Creating national group…')
  await ensureNationalGroup()

  console.log('Creating 16 regional groups…')
  for (const region of GHANA_REGIONS) {
    await ensureRegionalGroup(region)
  }

  console.log('Adding every active member to their groups…')
  await backfillAllGroups()

  const conv = await prisma.conversation.findMany({
    where:  { kind: { not: null } },
    include: { _count: { select: { participants: true } } },
    orderBy: { kind: 'asc' },
  })

  console.log('')
  console.log('=== Groups now in place ===')
  for (const c of conv) {
    const label = c.kind === 'NATIONAL' ? 'National' : `${c.region}`
    console.log(`  ${label.padEnd(20)} → ${c._count.participants} member(s)`)
  }
  console.log('')
  console.log('Done.')
}

main()
  .catch(e => { console.error('Backfill failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
