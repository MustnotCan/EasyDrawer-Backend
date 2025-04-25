import fs from "node:fs/promises";
import { saveBook, findBooksByPath } from "../../db/bookModel.js";
import path from "node:path";
import { configDotenv } from "dotenv";
import { randomUUID } from "node:crypto";
import { addToQueue } from "../thumbnailGeneration/thumbQueue.js";
configDotenv();
export async function addPdfToDb(filePath) {
  const relativePath = filePath.slice(
    "/dev/shm/pdfManApp".length,
    filePath.length,
  );
  const parsedFilePath = path.parse(filePath);
  const name = parsedFilePath.base;

  let thumbnailPath;
  try {
    const lastRead = (await fs.stat(filePath)).atime;
    const foundBook = await findBooksByPath(relativePath);
    let savedBook = {};
    if (foundBook == null) {
      const uuid = randomUUID();
      thumbnailPath = process.env.THUMBNAIL_FOLDER + path.join(uuid + ".webp");
      savedBook = await saveBook(uuid, name, relativePath, lastRead, []);
    } else {
      savedBook = foundBook;
      thumbnailPath = process.env.THUMBNAIL_FOLDER + savedBook.id + ".webp";
    }
    try {
      await fs.access(thumbnailPath);
      await fs.rm(filePath);
    } catch {
      addToQueue(filePath, savedBook.id);
    }
  } catch (err) {
    return err;
  }
}
