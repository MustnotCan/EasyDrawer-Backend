import { readdir } from "node:fs/promises";
import path from "path";
import { addPdfToDb } from "./pdfsOperation/addPdfToDb.js";
import { runQueue } from "./thumbnailGeneration/thumbQueue.js";
import { generateThumbnail } from "./pdfsOperation/generateThumbnail.js";
function flagger() {
  let flag = true;
  function setFlag(newFlag) {
    flag = newFlag;
  }
  function getFlag() {
    return flag;
  }
  return { setter: setFlag, getter: getFlag };
}
function cleaner() {
  let cleanTime = false;
  function setcleanTime(newcleanTime) {
    cleanTime = newcleanTime;
  }
  function getcleanTime() {
    return cleanTime;
  }
  return { setter: setcleanTime, getter: getcleanTime };
}
export const flag = flagger();
export const cleanTime = cleaner();

export async function gen(files) {
  while (files.length != 0 && flag.getter() == true) {
    const file = files.shift();
    const { filePath, thumbnailPath, savedBook } = await addPdfToDb(file);
    await generateThumbnail({ filePath, thumbnailPath, savedBook });
  }
  await runQueue();
}
export async function loop() {
  if (flag.getter()) {
    try {
      const files = (
        await readdir("/dev/shm/pdfManApp", {
          withFileTypes: true,
          recursive: true,
        })
      )
        .filter((res) => res.isFile() && res.name.endsWith("pdf"))
        .map((file) => {
          return path.join(file.parentPath, file.name);
        });
      await gen(files);
    } catch {
      // just the pdfManAPp not existing yet
    }
  } else {
    return;
  }
}
