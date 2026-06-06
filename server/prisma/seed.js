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

  // ── Sample news articles ───────────────────────────────────────────────────
  const newsCount = await prisma.newsArticle.count()
  if (newsCount === 0) {
    await prisma.newsArticle.createMany({
      data: [
        {
          title:    'COSSA-CHED Elects New Executive Committee at 2026 Annual Congress',
          excerpt:  'The CHED Senior Staff Association held its Annual Congress and successfully elected a new executive committee to lead for the 2026–2028 term.',
          body:     'The CHED Senior Staff Association held its Annual Congress at COCOBOD Headquarters in Accra on 15 May 2026 and successfully elected a new executive committee to lead the association for the 2026–2028 term.\n\nMembers gathered from all ten cocoa-growing regions to exercise their democratic right in a transparent and orderly process. The newly elected officers — President, Vice President, General Secretary, Treasurer, Public Relations Officer, and Welfare Officer — will be officially inaugurated at a ceremony scheduled for June.\n\nThe outgoing executive committee was commended for its dedicated service over the past two years, particularly in negotiating improved welfare benefits and championing professional development initiatives for members.',
          category: 'Congress',
          imageUrl: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1200&q=80',
          publishedAt: new Date('2026-05-15T09:00:00Z'),
          authorId: admin.id,
        },
        {
          title:    'Extension Officers Complete CSSVD Awareness & Capsid Control Programme',
          excerpt:  'A refresher training programme on Cocoa Swollen Shoot Virus Disease control and capsid management was held for CHED extension officers.',
          body:     'A refresher training programme on Cocoa Swollen Shoot Virus Disease (CSSVD) control and capsid management was held for CHED extension officers across all ten cocoa-growing regions in early April 2026.\n\nThe programme equipped officers with updated protocols for early disease detection, modern capsid control methods, and recommended protective equipment guidance ahead of the peak disease season. Officers also reviewed the latest data on disease spread patterns and discussed strategies for engaging farmers in community-based control initiatives.\n\nCOSSA-CHED recognises the critical role its members play in safeguarding Ghana\'s cocoa output and supports continuous professional development as part of its core mandate.',
          category: 'Training',
          imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80',
          publishedAt: new Date('2026-04-03T09:00:00Z'),
          authorId: admin.id,
        },
        {
          title:    'COSSA-CHED Q2 Welfare Fund Applications Now Open for Members',
          excerpt:  'The Welfare Committee announces that applications for the Q2 welfare fund cycle are now open. Submissions accepted through the member portal.',
          body:     'The COSSA-CHED Welfare Committee is pleased to announce that applications for the Q2 welfare fund cycle are now open. Eligible members may apply for medical support, bereavement aid, education grants for their children, emergency loans, and other approved categories of assistance.\n\nApplications are submitted through the member portal under the Welfare Requests tab. Members are encouraged to submit applications early — the cycle closes on 30 May 2026. The Welfare Officer will review each request and the committee meets weekly to process approvals.\n\nMembers requiring guidance on the application process should contact the secretariat at cossa-ched@cocobod.gh or +233 30 266 1877.',
          category: 'Welfare',
          imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80',
          publishedAt: new Date('2026-03-18T09:00:00Z'),
          authorId: admin.id,
        },
        {
          title:    'Mass CSSVD Disease Control Drive Covers Over 45,000 Hectares',
          excerpt:  'CHED officers completed the latest phase of the national CSSVD disease control campaign, treating more than 45,000 hectares of cocoa farms.',
          body:     'CHED officers completed the latest phase of the national Cocoa Swollen Shoot Virus Disease (CSSVD) control campaign, treating more than 45,000 hectares of cocoa farms across the Ashanti, Western, and Eastern Regions.\n\nThe exercise forms part of COCOBOD\'s broader strategy to protect Ghana\'s cocoa output and support farmer livelihoods. COSSA-CHED members coordinated the field operations, working closely with farmer cooperatives to ensure thorough coverage of affected areas.\n\nThe association acknowledges the dedication and long hours put in by its members during the campaign and continues to advocate for improved field allowances and protective equipment provisions.',
          category: 'Campaign',
          imageUrl: 'https://images.unsplash.com/photo-1574482620881-6f2a6c9a98a2?w=1200&q=80',
          publishedAt: new Date('2026-02-20T09:00:00Z'),
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
