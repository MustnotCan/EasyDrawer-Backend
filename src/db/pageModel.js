import prisma from "./prismaInit.js";
import { sanitizeString } from "../utils/sanitizers.js";
export async function addPageToTextContext(documents, fileId) {
  try {
    const textContent = await prisma.textContent.create({
      data: { bookId: fileId },
    });
    const textPage = documents.map((doc) => ({
      text: sanitizeString(doc["content"]),
      pageNumber: doc["page"],
      textContentId: textContent.id,
    }));
    await prisma.book.update({
      where: { id: fileId },
      data: { textExtracted: true },
    });
    await prisma.page.createMany({ data: [...textPage] });
  } catch (e) {
    console.error(e);
  }
}

export async function getPagesByBook(bookId) {
  try {
    const responses = await prisma.textContent.findUnique({
      where: { bookId: bookId },
      select: {
        pages: { select: { text: true, id: true, pageNumber: true } },
      },
    });
    return responses.pages.map((rs) => ({ ...rs, fileId: bookId }));
  } catch (e) {
    console.error(e);
  }
}
