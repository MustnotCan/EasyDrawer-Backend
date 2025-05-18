import fs from "node:fs/promises";
import { addToQueue } from "../thumbnailGeneration/thumbQueue.js";
export async function generateThumbnail({
  filePath,
  thumbnailPath,
  savedBook,
}) {
  try {
    // thumb already generated, removing file from ram
    await fs.access(thumbnailPath);
    await fs.rm(filePath);
  } catch {
    addToQueue(filePath, savedBook.id);
  }
}
