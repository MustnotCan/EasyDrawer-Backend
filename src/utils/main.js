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
    .map((file) => path.join(file.parentPath, file.name)),
);
copier.startOp(
  files.filter(
    (file) => !existingValidThumbs.map((file) => file.path).includes(file),
  ),
);
async function run() {
  while (!copier.done) {
    await loop();
  }
  await loop();
  doneGenerating = true;
  console.log("Thumbs ready...");
}
run();
const app = getExpressApp();
app.listen(3000, () => console.log("Server started on http://localhost:3000"));
