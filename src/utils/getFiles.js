import { addPdfToDb } from "./pdfsOperation/addPdfToDb.js";
import chokidar from "chokidar";
import { configDotenv } from "dotenv";
import { env } from "node:process";
import { removePdfFromDb } from "./pdfsOperation/removePdfFromDb.js";

configDotenv();
const watcher = chokidar.watch(env.FOLDER_PATH, {
  persistent: true,
  ignoreInitial: false,
});
watcher.on("add", async (filePath) => {
  await addPdfToDb(filePath);
});

watcher.on("unlink", async (filePath) => {
  await removePdfFromDb(filePath);
});
