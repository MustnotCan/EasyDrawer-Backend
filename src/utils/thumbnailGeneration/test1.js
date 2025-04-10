import runInWorker from "./runner.js";
export let queue = { number: 1, files: [] };
export function addToQueue(filePath, uuid) {
  if (queue.files.length == 40) {
    runInWorker(queue);
    console.log("Queue :", queue.number, " just started");
    queue.number += 1;
    queue.files = [];
  }
  if (filePath != null) {
    queue.files.push({ filePath: filePath, uuid: uuid });
  }
}
