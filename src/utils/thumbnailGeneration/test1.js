import runInWorker from "./runner.js";
export let queue = [];
export function addToQueue(filePath, uuid) {
  if (queue.length == 10) {
    runInWorker(queue);
    queue = [];
  }
  queue.push({ filePath: filePath, uuid: uuid });
}
