import { queueHandling } from "./thumbGeneration.js";
import { cleaner } from "../runGen.js";

export let queue = [];

/**
 * start generation of thumbnails
 */
export async function runQueue() {
  if (!cleaner.cleanTime) {
    const workingQueue = queue.slice();
    queue = [];
    await queueHandling(workingQueue);
  }
}
/**
 * add a file to the Queue for thumbnail generation
 * @param {string} filePath
 * @param {string} uuid
 */
export function addToQueue(filePath, uuid) {
  if (filePath != null) {
    queue.push({ filePath: filePath, uuid: uuid });
  }
}
