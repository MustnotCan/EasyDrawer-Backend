import fs from "node:fs/promises";
import { saveBook, findBooksByPathAndTitle } from "../../db/bookModel.js";
import path from "node:path";
import { v5 as uuidv5 } from "uuid";

/**
 * takes a pdf path and add it to db
 * @param {string} filePath
 * @type {object}
 * @returns {object} {filePath, thumbnailPath, savedBook}
 */
export async function addPdfToDb(filePath) {
  const name = filePath.slice(filePath.lastIndexOf("/") + 1);
  let relativePath = filePath.slice(
    process.env.FOLDER_PATH.length,
    filePath.length - name.length - 1,
  );
  if (relativePath.length == 0) {
    relativePath = "/";
  }
  let thumbnailPath;
  const lastRead = (await fs.stat(filePath)).atime;
  const foundBook = await findBooksByPathAndTitle(name, relativePath);
  let savedBook = {};
  if (foundBook == null) {
    const uuid = uuidv5(filePath, uuidv5.URL);
    const thumbnail = uuidv5(name, uuidv5.URL);
    thumbnailPath =
      process.env.THUMBNAIL_FOLDER + path.join(thumbnail + ".webp");
    savedBook = await saveBook(uuid, name, relativePath, lastRead, []);
  } else {
    savedBook = foundBook;
    thumbnailPath = process.env.THUMBNAIL_FOLDER + savedBook.id + ".webp";
  }
  return { filePath, thumbnailPath, savedBook };
}
