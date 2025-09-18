import { saveBook, findBooksByPathAndTitle } from "../../db/bookModel.js";
import path from "node:path";
import { env } from "node:process";
/**
 * takes a pdf path and add it to db
 * @param {string} filePath
 * @type {object}
 * @returns {object} {filePath, thumbnailPath, savedBook}
 */
export async function addPdfToDb(file) {
  let fullPath = file.fullPath;
  let thumbnailPath;
  const foundBook = await findBooksByPathAndTitle(file.name, file.relativePath);
  let savedBook = {};
  if (
    foundBook == null ||
    foundBook.lastAccess == undefined ||
    foundBook.lastModified == undefined ||
    foundBook.addedDate == undefined
  ) {
    thumbnailPath = env.THUMBNAIL_FOLDER + path.join(file.thumbnail + ".webp");

    savedBook = await saveBook(
      file.uuid,
      file.name,
      file.relativePath,
      file.lastAccess,
      file.lastModified,
      file.addedDate,
      [],
    );
  } else {
    savedBook = foundBook;
    thumbnailPath = env.THUMBNAIL_FOLDER + savedBook.id + ".webp";
  }
  return { fullPath, thumbnailPath, savedBook };
}
