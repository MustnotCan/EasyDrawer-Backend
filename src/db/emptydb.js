import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export async function emptyDB() {
  try {
    await prisma.book.deleteMany();
    await prisma.tag.deleteMany();
  } catch (e) {
    console.log("Error while emptying db", e);
  }
}
await emptyDB();
