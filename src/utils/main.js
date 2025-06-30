import { env } from "node:process";
import { readdir } from "node:fs/promises";
import copyRun from "./syncCopyRun.js";
import path from "node:path";
import { cleanup } from "./cleanup.js";
import { loop } from "./runGen.js";
import getExpressApp from "../Controllers/index.js";
import { getAllBooks } from "../db/bookModel.js";
import { accessSync, statSync } from "node:fs";
import { configDotenv } from "dotenv";
configDotenv();
let doneGenerating = false;

process.on("SIGINT", async () => {
  if (doneGenerating != true) {
    console.log("\n Manual exit, thumb generations not done");
  }
  console.log("\n Manual exit");
  await cleanup();
});
process.on("beforeExit", async () => {
  await cleanup();
});
export const copier = new copyRun();
const existingBooks = await getAllBooks();
const existingValidThumbs = existingBooks.filter((book) => {
  try {
    const filePath = path.join(env.THUMBNAIL_FOLDER, book.id + ".webp");
    accessSync(filePath);
    return statSync(filePath).size != 0;
  } catch {
    return false;
  }
});
const res = await readdir(env.FOLDER_PATH, {
  recursive: true,
  withFileTypes: true,
});
const files = [];
files.push(
  ...res
    .filter((file) => file.isFile() && path.parse(file.name).ext == ".pdf")
    .map((file) => path.join(file.parentPath, file.name)),
);
export async function run(copy) {
  while (!copy.done) {
    await loop();
  }
  await loop();
  doneGenerating = true;
  console.log("Thumbs ready...");
}
//good here
const app = getExpressApp();
app.listen(env.PORT, async () => {
  console.log(`Server started on http://localhost:${env.PORT}`);
  const validPaths = new Set(
    existingValidThumbs.map((file) =>
      path.join(env.FOLDER_PATH, file.path, file.title),
    ),
  );

  const copierFiles = await Promise.all(
    files.map(
      (file) =>
        new Promise((resolve) => {
          setImmediate(() => {
            if (!validPaths.has(file)) {
              resolve(file.replace(process.env.FOLDER_PATH, ""));
            } else {
              resolve(null);
            }
          });
        }),
    ),
  );

  const filteredCopierFiles = copierFiles.filter((file) => file !== null);

  const nbrofFiles = filteredCopierFiles.length;
  copier.startOp(filteredCopierFiles);
  if (nbrofFiles > 0) {
    console.time(`Generating thumbnails for ${nbrofFiles} files`);
    run(copier).then(() => {
      console.timeEnd(`Generating thumbnails for ${nbrofFiles} files`);
    });
  } else {
    console.log("no new files found at startup");
  }
});
