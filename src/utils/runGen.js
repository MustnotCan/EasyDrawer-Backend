import { readdir } from "node:fs/promises";
import { configDotenv } from "dotenv";
import path from "path";
import { addPdfToDb } from "./pdfsOperation/addPdfToDb.js";
import { runQueue } from "./thumbnailGeneration/thumbQueue.js";
configDotenv();

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
    await addPdfToDb(file);
  }
  await runQueue();
}
export async function loop() {
  if (flag.getter()) {
    const files = (
      await readdir("/dev/shm", { withFileTypes: true, recursive: true })
    )
      .filter((res) => res.isFile() && res.name.endsWith("pdf"))
      .map((file) => path.join(file.parentPath, file.name));
    await gen(files);
  } else {
    return;
  }
}
