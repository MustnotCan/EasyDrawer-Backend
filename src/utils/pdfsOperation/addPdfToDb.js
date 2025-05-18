import fs from "node:fs/promises";
import { saveBook, findBooksByPathAndTitle } from "../../db/bookModel.js";
import path from "node:path";
import { randomUUID } from "node:crypto";
export async function addPdfToDb(filePath) {
  const relativePath = filePath.slice(
    "/dev/shm/pdfManApp".length,
    filePath.lastIndexOf("/"),
  );
  const parsedFilePath = path.parse(filePath);
  const name = parsedFilePath.base;
  let thumbnailPath;
  try {
    const lastRead = (await fs.stat(filePath)).atime;

    const foundBook = await findBooksByPathAndTitle(name, relativePath);
    let savedBook = {};
    if (foundBook == null) {
      const uuid = randomUUID();
      thumbnailPath = process.env.THUMBNAIL_FOLDER + path.join(uuid + ".webp");
      savedBook = await saveBook(uuid, name, relativePath, lastRead, []);
    } else {
      savedBook = foundBook;
      thumbnailPath = process.env.THUMBNAIL_FOLDER + savedBook.id + ".webp";
    }
    return { filePath, thumbnailPath, savedBook };
  } catch (err) {
    return err;
  }
}
