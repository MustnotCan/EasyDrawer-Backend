import prisma from "./prismaInit.js";

export async function findPageModelBy(bookId) {
  try {
    return await prisma.textContent.findUnique({ where: { bookId: bookId } });
  } catch (e) {
    console.error(e);
  }
}
export async function findPageInPageModel(pageModelId) {
  try {
    return await prisma.textContent.findFirst({
      where: { id: pageModelId },
      select: { pages: true },
    });
  } catch (e) {
    console.error(e);
  }
}
