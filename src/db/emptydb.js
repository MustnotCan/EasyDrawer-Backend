import prisma from "./prismaInit.js";
export async function emptyDB() {
  await prisma.book.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.page.deleteMany();
  await prisma.textContent.deleteMany();
}
await emptyDB();
