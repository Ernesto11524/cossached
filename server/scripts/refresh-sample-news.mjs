// One-off script — run on the VPS to clear the four original sample news
// articles inserted by the seed and replace them with the two real articles
// based on the May 2026 Germany study tour.
//
// Usage (on VPS):  cd /var/www/cossached/server && node scripts/refresh-sample-news.mjs
//
// Idempotent — safe to run more than once. Deletes are matched by exact title,
// inserts are skipped if an article with the same title already exists.

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const OLD_SAMPLE_TITLES = [
  'COSSA-CHED Elects New Executive Committee at 2026 Annual Congress',
  'Extension Officers Complete CSSVD Awareness & Capsid Control Programme',
  'COSSA-CHED Q2 Welfare Fund Applications Now Open for Members',
  'Mass CSSVD Disease Control Drive Covers Over 45,000 Hectares',
]

const NEW_ARTICLES = [
  {
    title:    'COSSA-CHED Delegation Hosts Knowledge Exchange with German Agricultural Educators',
    excerpt:  'A COSSA-CHED delegation engaged with the SDW Landwirtschaftliches Bildungswerk in Germany for a knowledge exchange on sustainable agricultural training and farmer-extension methods.',
    body:     `A COSSA-CHED delegation engaged with the SDW Landwirtschaftliches Bildungswerk in Germany for a structured knowledge-exchange programme on sustainable agricultural training and farmer-extension methods.\n\nDuring the session, members of the delegation presented Ghanaian cocoa to their German hosts and shared the methodologies CHED extension officers use across the cocoa-growing regions of Ghana. The German side, in turn, walked the delegation through their education frameworks for agricultural professionals — covering curriculum design, hands-on field training, and how technical knowledge is transferred to working farmers.\n\nDiscussions also covered climate-resilient practices, soil health management, and how associations like COSSA-CHED can play a stronger role in continuous professional development for their members.\n\nThe COSSA-CHED Secretariat has committed to translating the lessons from this exchange into upcoming training cycles and is exploring opportunities for follow-up collaboration with SDW and partner institutions.`,
    category: 'International',
    imageUrl: '/news_sample.jpg',
    publishedAt: new Date('2026-05-22T09:00:00Z'),
  },
  {
    title:    'COSSA-CHED Members Tour Stüffel Gärtnerhof to Study Direct-to-Consumer Farm Models',
    excerpt:  'As part of the international study programme, COSSA-CHED members visited Stüffel Gärtnerhof — a Demeter-certified organic farm in Germany — to observe sustainable production and direct-marketing practices.',
    body:     `As part of the international study programme, COSSA-CHED members visited Stüffel Gärtnerhof & Hofladen — a Demeter-certified organic farm and farm shop in Germany — to observe sustainable production and direct-to-consumer marketing practices first-hand.\n\nThe visit gave delegates the opportunity to walk through the production areas, speak with the farm operators, and study how a regional farm balances organic certification, year-round operations, and a direct relationship with neighbouring consumers. The Demeter biodynamic model — which emphasises soil health, biodiversity, and closed-loop farming — was of particular interest given its parallels with cocoa-agroforestry practices being promoted in Ghana.\n\nMembers discussed how the principles observed — regional supply chains, traceability, and farmer-led marketing — could be adapted by CHED extension officers when supporting cocoa farmer cooperatives back home.\n\nThe delegation returned with concrete ideas for strengthening farmer training, improving on-farm record-keeping, and supporting the gradual move toward more sustainable cocoa production models.`,
    category: 'Study Tour',
    imageUrl: '/about-hero.jpg',
    publishedAt: new Date('2026-05-24T09:00:00Z'),
  },
]

async function main() {
  // Need an admin user to attribute the articles to (authorId is required)
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) {
    console.error('❌ No admin user found — cannot set authorId. Aborting.')
    process.exit(1)
  }

  // 1) Delete the four old sample articles (if they still exist)
  const del = await prisma.newsArticle.deleteMany({
    where: { title: { in: OLD_SAMPLE_TITLES } },
  })
  console.log(`🗑  Deleted ${del.count} old sample article(s).`)

  // 2) Insert the two new articles (skip any whose title already exists)
  let inserted = 0
  for (const a of NEW_ARTICLES) {
    const exists = await prisma.newsArticle.findFirst({ where: { title: a.title } })
    if (exists) {
      console.log(`⏭  Skipped (already exists): ${a.title}`)
      continue
    }
    await prisma.newsArticle.create({ data: { ...a, authorId: admin.id } })
    console.log(`✓ Inserted: ${a.title}`)
    inserted++
  }

  console.log(`\n✅ Done. Inserted ${inserted} new article(s).`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
