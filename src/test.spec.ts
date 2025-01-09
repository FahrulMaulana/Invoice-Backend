import { PrismaClient } from '@prisma/client'

test('test', async () => {
  const prisma = new PrismaClient()
  const get = await prisma.mst_role.findMany()
  console.log(get)
}, 100000)
