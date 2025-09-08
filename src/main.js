import { env } from "node:process";
import copyRun from "./utils/syncCopyRun.js";
import { cleanup } from "./utils/cleanup.js";
import getExpressApp from "./Controllers/index.js";
import { configDotenv } from "dotenv";
import { newFiles } from "./utils/utils.js";

configDotenv();
let doneGenerating = false;
process.on("SIGINT", async () => {
  if (doneGenerating != true) {
    console.log("\n Manual exit, thumbnail generation is not done");
  }
  console.log("\n Shutting down the application");
  await cleanup();
});
process.on("beforeExit", async () => {
  await cleanup();
});

export const copier = new copyRun();
export let nbrofFiles = 0;
const app = getExpressApp();
app.listen(env.PORT, async () => {
  console.log(`Server started on http://localhost:${env.PORT}`);
  const { filesToAddToDb, thumbnailsToGenerate } = await newFiles();
  if (filesToAddToDb.length > 0) {
    console.log(" --> Found new Files: adding to db !");
    console.log(`adding ${filesToAddToDb.length} new files to db `);
    copier.addFilesToDb(filesToAddToDb);
  }
  nbrofFiles = thumbnailsToGenerate.length;
  if (nbrofFiles > 0) {
    console.log(" --> Starting generating thumbnails !");
    copier.startCopyingFilesToRam(thumbnailsToGenerate);
    console.time(`Generated thumbnails for ${nbrofFiles} files in`);
    copier.startGeneratingThumbnails().then(() => {
      copier.done == true;
      console.timeEnd(`Generated thumbnails for ${nbrofFiles} files in`);
    });
  } else {
    console.log("No new thumbnails to generate found at startup");
  }
  doneGenerating = true;
});
