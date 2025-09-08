import { copier } from "../main.js";
import { readdir, rm } from "fs/promises";
import path from "path";
import { flagger, cleaner } from "./runGen.js";
export async function cleanup() {
  copier.keepLooping = false;
  copier.done = true;
  cleaner.cleanTime = true;
  flagger.flag = false;
  let files = [];
  try {
    files = (
      await readdir("/dev/shm/pdfManApp", {
        recursive: true,
        withFileTypes: true,
      })
    ).sort(
      (a, b) =>
        path.join(b.parentPath, b.name).length -
        path.join(a.parentPath, a.name).length,
    );
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
      await rm(path.join(file.parentPath, file.name), {
        recursive: file.isDirectory(),
      });
      files.shift();
    } catch (e) {
      console.error("Error Happened");
      if (e.code == "ENOENT") {
        console.log("still Shifting");
        files.shift();
      } else {
        console.error(e);
      }
    }
  }
  process.exit();
}
