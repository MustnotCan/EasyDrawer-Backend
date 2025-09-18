import { readdir } from "node:fs/promises";
import path from "path";
import { addToQueue, runQueue } from "./thumbnailGeneration/thumbQueue.js";
import { v5 as uuidv5 } from "uuid";

/**
 * if true then continue looping
 */
export let flagger = {
  _flag: true,
  set flag(newFlag) {
    this._flag = newFlag;
  },
  get flag() {
    return this._flag;
  },
};
/**
 * if true then clean the shm
 */
export let cleaner = {
  _cleanTime: false,
  set cleanTime(newCleanTime) {
    this._cleanTime = newCleanTime;
  },
  get cleanTime() {
    return this._cleanTime;
  },
};
/**
 * takes an array of string paths then generate thumbnails
 * @param {string[]} files
 */
export async function gen(files) {
  while (files.length != 0 && flagger.flag == true) {
    const file = files.shift();
    addToQueue(file.filePath, file.id);
  }
  await runQueue();
}
/**
 * reads shm and loop over found files adding them to queue
 */
export async function loop() {
  if (flagger.flag) {
    try {
      const files = (
        await readdir("/dev/shm/pdfManApp", {
          withFileTypes: true,
          recursive: true,
        })
      )
        .filter((res) => res.isFile() && res.name.endsWith(".pdf"))
        .map((file) => ({
          filePath: path.join(file.parentPath, file.name),
          id: uuidv5(file.name, uuidv5.URL),
        }));
      if (files.length > 0) await gen(files);
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
  }
}
