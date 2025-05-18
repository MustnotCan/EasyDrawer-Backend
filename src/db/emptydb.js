import prisma from "./prismaInit.js";
export async function emptyDB() {
  try {
    await prisma.book.deleteMany();
    await prisma.tag.deleteMany();
  } catch (e) {
    console.log("Error while emptying db", e);
  }
}
await emptyDB();
