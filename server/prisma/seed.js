import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_PASSWORD  = 'chedssa-admin-2026'
const MEMBER_PASSWORD = 'chedssa2026'
const BCRYPT_ROUNDS   = 12

async function main() {
  console.log('Seeding database…\n')

  const adminHash  = await bcrypt.hash(ADMIN_PASSWORD,  BCRYPT_ROUNDS)
  const memberHash = await bcrypt.hash(MEMBER_PASSWORD, BCRYPT_ROUNDS)

  // ── Admin ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where:  { staffId: 'CHED-001' },
    update: {},
    create: {
      staffId:      'CHED-001',
      email:        'admin@chedssa.gh',
      name:         'COSSA-CHED Administrator',
      role:         'ADMIN',
      department:   'CHED Headquarters',
      position:     'System Administrator',
      passwordHash: adminHash,
    },
  })

  // ── Sample members ─────────────────────────────────────────────────────────
  const members = [
    { staffId: 'CHED-002', email: 'kwame.mensah@cocobod.gh',  name: 'Kwame Mensah',  department: 'CHED Headquarters',   position: 'President'          },
    { staffId: 'CHED-003', email: 'abena.owusu@cocobod.gh',   name: 'Abena Owusu',   department: 'Regional CHED Office', position: 'Vice President'     },
    { staffId: 'CHED-004', email: 'kwame.darko@cocobod.gh',   name: 'Kwame Darko',   department: 'CHED Headquarters',   position: 'General Secretary'   },
    { staffId: 'CHED-005', email: 'ama.boateng@cocobod.gh',   name: 'Ama Boateng',   department: 'Disease Control',     position: 'Treasurer'           },
    { staffId: 'CHED-006', email: 'yaw.asante@cocobod.gh',    name: 'Yaw Asante',    department: 'Extension Services',  position: 'PRO'                 },
    { staffId: 'CHED-007', email: 'efua.kyeremeh@cocobod.gh', name: 'Efua Kyeremeh', department: 'Research & Training', position: 'Welfare Officer'     },
  ]

  for (const m of members) {
    await prisma.user.upsert({
      where:  { staffId: m.staffId },
      update: {},
      create: { ...m, role: 'MEMBER', passwordHash: memberHash },
    })
  }

  // ── Sample announcements ───────────────────────────────────────────────────
  await prisma.announcement.createMany({
    skipDuplicates: true,
    data: [
      {
        title:    'AGM scheduled for 27 June 2026 at COCOBOD Headquarters, Accra',
        body:     'All COSSA-CHED members are required to attend the Annual General Meeting. Venue details and agenda will be circulated one week before the date.',
        category: 'Urgent',
        authorId: admin.id,
      },
      {
        title:    'Q2 welfare fund applications close 30 May 2026',
        body:     'Submit your welfare applications early through the member portal. Applications received after the deadline will be deferred to the Q3 cycle.',
        category: 'Welfare',
        authorId: admin.id,
      },
      {
        title:    'Updated COSSA-CHED Constitution & Bye-Laws 2026 now available',
        body:     'The revised constitution has been uploaded to the Documents section. Members are encouraged to review the changes before the AGM.',
        category: 'Document',
        authorId: admin.id,
      },
      {
        title:    'New field allowance policy circular issued for all regional CHED staff',
        body:     'The updated field allowance rates and claim procedures are effective from 1 April 2026. Please review and submit queries to the secretariat.',
        category: 'Policy',
        authorId: admin.id,
      },
    ],
  })

  // ── Sample events ──────────────────────────────────────────────────────────
  await prisma.event.createMany({
    skipDuplicates: true,
    data: [
      {
        title:       'Annual General Meeting (AGM) 2026',
        location:    'COCOBOD HQ Auditorium, Accra',
        eventDate:   new Date('2026-06-27T09:00:00Z'),
        type:        'AGM',
        createdById: admin.id,
      },
      {
        title:       'Industrial Relations Workshop',
        location:    'Accra Metropolitan Hotel',
        eventDate:   new Date('2026-07-10T09:00:00Z'),
        type:        'Training',
        createdById: admin.id,
      },
      {
        title:       'Welfare Fund Review Committee Meeting',
        location:    'COSSA-CHED Boardroom, COCOBOD HQ',
        eventDate:   new Date('2026-08-15T10:00:00Z'),
        type:        'Meeting',
        createdById: admin.id,
      },
    ],
  })

  // ── Initial news articles ──────────────────────────────────────────────────
  // Only inserted into a fresh database (when the news table is empty).
  // On the live VPS, news is managed through the admin portal.
  const newsCount = await prisma.newsArticle.count()
  if (newsCount === 0) {
    await prisma.newsArticle.createMany({
      data: [
        {
          title:    'COSSA-CHED Delegation Hosts Knowledge Exchange with German Agricultural Educators',
          excerpt:  'A COSSA-CHED delegation engaged with the SDW Landwirtschaftliches Bildungswerk in Germany for a knowledge exchange on sustainable agricultural training and farmer-extension methods.',
          body:     'A COSSA-CHED delegation engaged with the SDW Landwirtschaftliches Bildungswerk in Germany for a structured knowledge-exchange programme on sustainable agricultural training and farmer-extension methods.\n\nDuring the session, members of the delegation presented Ghanaian cocoa to their German hosts and shared the methodologies CHED extension officers use across the cocoa-growing regions of Ghana. The German side, in turn, walked the delegation through their education frameworks for agricultural professionals — covering curriculum design, hands-on field training, and how technical knowledge is transferred to working farmers.\n\nDiscussions also covered climate-resilient practices, soil health management, and how associations like COSSA-CHED can play a stronger role in continuous professional development for their members.\n\nThe COSSA-CHED Secretariat has committed to translating the lessons from this exchange into upcoming training cycles and is exploring opportunities for follow-up collaboration with SDW and partner institutions.',
          category: 'International',
          imageUrl: '/news_sample.jpg',
          publishedAt: new Date('2026-05-22T09:00:00Z'),
          authorId: admin.id,
        },
        {
          title:    'COSSA-CHED Members Tour Stüffel Gärtnerhof to Study Direct-to-Consumer Farm Models',
          excerpt:  'As part of the international study programme, COSSA-CHED members visited Stüffel Gärtnerhof — a Demeter-certified organic farm in Germany — to observe sustainable production and direct-marketing practices.',
          body:     'As part of the international study programme, COSSA-CHED members visited Stüffel Gärtnerhof & Hofladen — a Demeter-certified organic farm and farm shop in Germany — to observe sustainable production and direct-to-consumer marketing practices first-hand.\n\nThe visit gave delegates the opportunity to walk through the production areas, speak with the farm operators, and study how a regional farm balances organic certification, year-round operations, and a direct relationship with neighbouring consumers. The Demeter biodynamic model — which emphasises soil health, biodiversity, and closed-loop farming — was of particular interest given its parallels with cocoa-agroforestry practices being promoted in Ghana.\n\nMembers discussed how the principles observed — regional supply chains, traceability, and farmer-led marketing — could be adapted by CHED extension officers when supporting cocoa farmer cooperatives back home.\n\nThe delegation returned with concrete ideas for strengthening farmer training, improving on-farm record-keeping, and supporting the gradual move toward more sustainable cocoa production models.',
          category: 'Study Tour',
          imageUrl: '/about-hero.jpg',
          publishedAt: new Date('2026-05-24T09:00:00Z'),
          authorId: admin.id,
        },
      ],
    })
  }

  console.log('✅ Seed complete.\n')
  console.log('── Admin login ─────────────────────────────────────')
  console.log(`   Staff ID : CHED-001`)
  console.log(`   Password : ${ADMIN_PASSWORD}`)
  console.log('\n── Member login (demo accounts) ────────────────────')
  console.log(`   Staff ID : CHED-002 through CHED-007`)
  console.log(`   Password : ${MEMBER_PASSWORD}`)
  console.log('────────────────────────────────────────────────────')
  console.log('⚠️  Change all passwords immediately in production.\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
