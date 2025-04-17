import { configDotenv } from "dotenv";
import { env } from "node:process";
import { removePdfFromDb } from "./pdfsOperation/removePdfFromDb.js";
import chokidar from "chokidar";
import { readdir } from "node:fs/promises";
import copyRun from "./syncCopyRun.js";
import path from "node:path";
import { cleanup } from "./cleanup.js";
import { loop } from "./runGen.js";
import getExpressApp from "../Controllers/index.js";
import { getAllBooks } from "../db/bookModel.js";
import { accessSync, statSync } from "node:fs";
configDotenv();
process.on("SIGINT", async () => {
  console.log("\n Manual exit, Must rerun");
  await cleanup();
});
process.on("beforeExit", async () => {
  await cleanup();
});
export const copier = new copyRun();
const existingBooks = await getAllBooks();
const existingValidThumbs = existingBooks.filter((book) => {
  try {
    const filePath = path.join(process.env.THUMBNAIL_FOLDER, book.id + ".webp");
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
    .filter(
      (file) =>
        file.isFile() &&
        path.parse(file.parentPath + "/" + file.name).ext == ".pdf",
    )
    .map((dir) => path.join(dir.parentPath, dir.name)),
);
copier.startOp(
  files.filter(
    (file) => !existingValidThumbs.map((file) => file.path).includes(file),
  ),
);
async function run() {
  while (!copier.done) {
    //console.log("looping");
    await loop();
  }
  await loop();
}
run();
const app = getExpressApp();
app.listen(3000, () => console.log("Server started on http://localhost:3000"));

const watcher = chokidar.watch(env.FOLDER_PATH, {
  persistent: true,
  ignoreInitial: true,
});
watcher.on("add", async (filePath) => {
  if (path.parse(filePath).ext != ".pdf") {
    return;
  } else {
    copier.startOp([filePath]);
    await loop();
  }
});

watcher.on("unlink", async (filePath) => {
  await removePdfFromDb(filePath);
});
