import { copier } from "./main.js";
import { readdir, rm } from "fs/promises";
import path from "path";
import { flag, cleanTime } from "./runGen.js";
export async function cleanup() {
  copier.keepLooping = false;
  copier.done = true;
  cleanTime.setter(true);
  flag.setter(false);
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
      console.info(
        "All thumbs are already generated or some copying error happened",
      );
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
      console.log("Error Happened");
      if (e.code == "ENOENT") {
        console.log("still Shifting");
        files.shift();
      }
    }
  }
  process.exit();
}
