import { findBookById } from "../db/bookModel.js";
import path from "node:path";
import fs from "fs";
import { env } from "node:process";
import { getAllBooks } from "../db/bookModel.js";
import { accessSync, readdirSync, statSync } from "node:fs";
import { v5 as uuidv5 } from "uuid";

export const servePdf = async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await findBookById(bookId);
    // To add ranges later
    const stream = fs.createReadStream(
      path.join(env.FOLDER_PATH, book.path, book.title),
    );

    stream.pipe(res);
  } catch (e) {
    console.log(e);
  }
};
export async function newFiles() {
  const existingBooks = await getAllBooks();
  const existingValidThumbs = existingBooks.filter((book) => {
    try {
      const thumbnailPath = path.join(
        env.THUMBNAIL_FOLDER,
        uuidv5(book.title, uuidv5.URL) + ".webp",
      );
      accessSync(thumbnailPath);
      return statSync(thumbnailPath).size != 0;
    } catch {
      return false;
    }
  });
  const res = readdirSync(env.FOLDER_PATH, {
    recursive: true,
    withFileTypes: true,
  });
  const files = [];
  files.push(
    ...res
      .filter((file) => file.isFile() && path.parse(file.name).ext == ".pdf")
      .sort(
        (a, b) =>
          path.join(b.parentPath, b.name).length -
          path.join(a.parentPath, a.name).length,
      )
      .map((file) => path.join(file.parentPath, file.name)),
  );
  const validPaths = new Set(
    existingValidThumbs.map((file) =>
      path.join(env.FOLDER_PATH, file.path, file.title),
    ),
  );
  const copierFiles = files
    .map((file) => {
      if (!validPaths.has(file)) {
        return file.replace(process.env.FOLDER_PATH, "");
      } else {
        return null;
      }
    })
    .filter((file) => file !== null);

  const uniqueFilesByTitle = new Set(
    copierFiles.map((filePath) =>
      filePath.slice(filePath.lastIndexOf("/") + 1),
    ),
  );
  const pathsOfUiques = [];
  uniqueFilesByTitle.forEach((title) => {
    const filePath = copierFiles.find(
      (filePath) => filePath.slice(filePath.lastIndexOf("/") + 1) == title,
    );
    pathsOfUiques.push({ filePath, name: title });
  });
  const thumbnailsToGenerate = pathsOfUiques.filter((f) => {
    try {
      const BookId = uuidv5(f.name, uuidv5.URL);
      fs.accessSync(process.env.THUMBNAIL_FOLDER + BookId + ".webp");
      return false;
    } catch (e) {
      if (e.code == "ENOENT") return true;
    }
  });
  return {
    filesToAddToDb: copierFiles,
    thumbnailsToGenerate: thumbnailsToGenerate,
  };
}
