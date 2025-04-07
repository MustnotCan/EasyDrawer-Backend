import fs from "node:fs/promises";
import { saveBook, findBooksByPath } from "../../db/bookModel.js";
import path from "node:path";
import { configDotenv } from "dotenv";
import { env } from "node:process";
import { thumbnailFile } from "../thumbnailGeneration/addingThumbnails.js";
import { randomUUID } from "node:crypto";
configDotenv();
export async function addPdfToDb(filePath) {
  const relativePath = filePath.slice(env.FOLDER_PATH.length, filePath.length);
  const parsedFilePath = path.parse(filePath);
  const name = parsedFilePath.base;
  if (parsedFilePath.ext != ".pdf") {
    return;
  }
  const lastRead = (await fs.stat(filePath)).atime;
  let thumbnailPath;
  try {
    const foundBook = await findBooksByPath(relativePath);
    let savedBook;
    if (foundBook == null) {
      const uuid = randomUUID();
      thumbnailPath = process.env.THUMBNAIL_FOLDER + path.join(uuid + ".webp");
      savedBook = await saveBook(uuid, name, relativePath, lastRead, []);
    } else {
      savedBook = foundBook;
      thumbnailPath = process.env.THUMBNAIL_FOLDER + savedBook.id + ".webp";
    }
    fs.access(thumbnailPath).catch(async () => {
      console.log("path:", thumbnailPath);
      console.log("Thumbnail not found");
      console.log("Generating...");
      console.log("uuid:", savedBook.id);
      thumbnailFile(filePath, savedBook.id);
    });
  } catch (err) {
    return err;
  }
}
