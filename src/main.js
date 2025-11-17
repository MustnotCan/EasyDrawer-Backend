import { env } from "node:process";
import getExpressApp from "./Controllers/index.js";
import { configDotenv } from "dotenv";
import { newFiles } from "./utils/utils.js";
import PdfFile from "./utils/pdfClass.js";
import "./utils/startup.js";
import { addThumbnailGenerationTask } from "./utils/tasksQueue.js";
import { addFilesToDb } from "./utils/addPdfToDb.js";
import { spawn } from "node:child_process";
configDotenv();
try {
  await new Promise((res, rej) => {
    const spawned = spawn("npx", ["prisma", "migrate", "deploy"]);
    spawned.on("exit", () => res());
    spawned.stdout.on("data", (data) => console.log(String(data)));
    spawned.on("error", (err) => rej(err));
  });
} catch (e) {
  console.error(e);
  process.exit();
}

const app = getExpressApp();
app.listen(env.PORT, async () => {
  console.log(`Server started on http://localhost:${env.PORT}`);
  const { filesToAddToDb, thumbnailsToGenerate } = await newFiles();
  if (filesToAddToDb.length > 0) {
    console.log(" --> Found new Files: adding to db !");
    console.log(`adding ${filesToAddToDb.length} new files to db `);
    addFilesToDb(filesToAddToDb.map((file) => PdfFile.fromFileSystem(file)));
  }
  if (thumbnailsToGenerate.length > 0) {
    console.log(
      " --> Starting generating thumbnails ! ",
      thumbnailsToGenerate.length,
    );
    console.time(`Generated thumbnails`);

    const promises = thumbnailsToGenerate.map((relativePath) =>
      addThumbnailGenerationTask(relativePath),
    );

    await Promise.all(promises);
    console.timeEnd(`Generated thumbnails`);
  } else {
    console.log("No new thumbnails to generate found at startup");
  }
});
