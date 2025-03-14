import fs from "node:fs/promises";
import { saveBook } from "../../db/index.js";
import path from "path";
import { configDotenv } from "dotenv";
import { env } from "node:process";
import { thumbnailFile } from "../thumbnailGeneration/addingThumbnails.js";
configDotenv();
export async function addPdfToDb(filePath) {
  const relativePath = filePath.slice(env.FOLDER_PATH.length, filePath.length);
  const parsedFilePath = path.parse(filePath);
  const name = parsedFilePath.base;
  const lastRead = (await fs.stat(filePath)).atime;
  const thumbnailPath = path.join(
    env.THUMBNAIL_FOLDER,
    parsedFilePath.name + ".webp",
  );
  try {
    await fs.access(thumbnailPath);
  } catch {
    console.log("Thumbnail not found");
    console.log("Generating...");
    await thumbnailFile(filePath);
  } finally {
    await saveBook(name, relativePath, lastRead, [], thumbnailPath);
  }
}
