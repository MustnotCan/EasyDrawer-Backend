import { findBookById } from "../db/bookModel.js";
import { join } from "node:path";
import { env } from "node:process";
import { getAllBooks } from "../db/bookModel.js";
import { accessSync, readdirSync, statSync, createReadStream } from "node:fs";
import { v5 as uuidv5 } from "uuid";

export const servePdf = async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await findBookById(bookId);
    const filePath = join(env.FOLDER_PATH, book.path, book.title);
    const stat = statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
      // Parse range: e.g. "bytes=1000-2000"
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "application/pdf",
      });
      createReadStream(filePath, { start, end }).pipe(res);
    } else {
      // No range requested, send full file
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "application/pdf",
        "Accept-Ranges": "bytes",
      });
      createReadStream(filePath).pipe(res);
    }
  } catch (e) {
    console.log(e);
  }
};
export async function newFiles() {
  const files = [];
  const foundFilesFS = readdirSync(env.FOLDER_PATH, {
    recursive: true,
    withFileTypes: true,
  }).filter((file) => file.isFile() && file.name.endsWith(".pdf"));
  files.push(...foundFilesFS.map((file) => join(file.parentPath, file.name)));
  const existingBooks = await getAllBooks();
  const existingBooksFullPaths = existingBooks.map((eb) =>
    join(env.FOLDER_PATH, eb.path, eb.title),
  );

  const copierFiles = files
    .filter((fl) => !existingBooksFullPaths.includes(fl))
    .map((file) => file.slice(env.FOLDER_PATH.length));
  const allBooksTitles = [...new Set(foundFilesFS.map((file) => file.name))];
  const existingValidThumbs = allBooksTitles.filter((bookTitle) => {
    try {
      const thumbnailPath = join(
        env.THUMBNAIL_FOLDER,
        uuidv5(bookTitle, uuidv5.URL) + ".webp",
      );
      accessSync(thumbnailPath);
      return statSync(thumbnailPath).size != 0;
    } catch {
      return false;
    }
  });

  const thumbnailsToGenerate = allBooksTitles
    .filter((bt) => !existingValidThumbs.includes(bt))
    .map((fileName) => foundFilesFS.find((file) => file.name == fileName))
    .map((file) =>
      join(file.parentPath.slice(env.FOLDER_PATH.length), file.name),
    );

  return {
    filesToAddToDb: copierFiles,
    thumbnailsToGenerate: thumbnailsToGenerate,
  };
}
