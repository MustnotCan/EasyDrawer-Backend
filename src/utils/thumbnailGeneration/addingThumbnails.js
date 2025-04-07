import path from "node:path";
import pLimit from "p-limit";
import runInWorker from "./runner.js";
const workerLimit = pLimit(50);

export function thumbnailFile(file, uuid) {
  const parsedPath = path.parse(file);
  if (parsedPath.ext != ".pdf") {
    console.error(Error(`${file} is not a pdf`));
    return;
  }

  try {
    const resolvedPath = path.resolve(file);
    workerLimit(() => runInWorker(resolvedPath, uuid)).then(() => {
      console.log(workerLimit.activeCount);
    });
  } catch (err) {
    console.log(err);
  }
}
