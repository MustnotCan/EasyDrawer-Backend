import { queueHandling } from "./thumbGeneration.js";
import { cleanTime } from "../runGen.js";
export let queue = { number: 1, files: [] };

export async function runQueue() {
  const workingQueue = {
    number: queue.number,
    files: [...queue.files],
  };
  if (!cleanTime.getter()) {
    await queueHandling(workingQueue);
  } else {
    return;
  }
}
export function addToQueue(filePath, uuid) {
  if (filePath != null) {
    queue.files.push({ filePath: filePath, uuid: uuid });
  }
}
