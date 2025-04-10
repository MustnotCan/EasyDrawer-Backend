import pLimit from "p-limit";
import { queueHandling } from "./thumb_worker.js";
import { queue } from "./test1.js";
const workerLimit = pLimit(50);

export function thumbnailFile() {
  try {
    workerLimit(() => queueHandling(queue)).then(() => {
      console.log(workerLimit.activeCount);
    });
  } catch (err) {
    console.log(err);
  }
}
