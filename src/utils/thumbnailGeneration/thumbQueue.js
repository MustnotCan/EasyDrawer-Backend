import { queueHandling } from "./thumbGeneration.js";
import { cleanTime } from "../runGen.js";
export let queue = [];

export async function runQueue() {
  if (!cleanTime.getter()) {
    const workingQueue = queue.slice();
    queue = [];
    await queueHandling(workingQueue);
  } else {
    return;
  }
}
export function addToQueue(filePath, uuid) {
  if (filePath != null) {
    queue.push({ filePath: filePath, uuid: uuid });
  }
}
