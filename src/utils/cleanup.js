import { copier } from "../main.js";
import { readdir, rm } from "fs/promises";
import { join } from "path";
import { flagger, cleaner } from "./runGen.js";
import { ac } from "./thumbnailGeneration/thumbGeneration.js";
export async function cleanup() {
  copier.keepLooping = false;
  copier.done = true;
  cleaner.cleanTime = true;
  flagger.flag = false;
  ac.abort();
  await clearnShm();
  process.exit();
}
export async function clearnShm() {
  let files = [];
  try {
    files = await readdir("/dev/shm/pdfManApp", {
      withFileTypes: true,
    });
  } catch (e) {
    if (e.code == "ENOENT") {
      if (files > 0)
        console.error(
          "All thumbs are already generated or some copying error happened",
        );
    } else {
      console.error(e);
    }
  }

  while (files.length != 0) {
    const file = files[0];
    try {
      await rm(join(file.parentPath, file.name), { recursive: true });
      files.shift();
    } catch (e) {
      console.error(e);
      files.shift();
    }
  }
}
