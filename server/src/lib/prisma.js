import { PrismaClient } from '@prisma/client'

// Singleton — prevents multiple connections during hot-reload in development
const globalForPrisma = globalThis

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient()
}

export const prisma = globalForPrisma.prisma
