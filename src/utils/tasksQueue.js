import PQueue from "p-queue";
import { cpus } from "node:os";
import { savePdfThumbnail } from "./thumbGeneration.js";
import { v5 as uuidv5 } from "uuid";
import { join } from "node:path";
import { env } from "node:process";

export const tasksQueue = new PQueue({ concurrency: cpus().length - 2 });

export const addThumbnailGenerationTask = (relativePath) =>
  tasksQueue.add(() =>
    savePdfThumbnail(
      join(env.FOLDER_PATH, relativePath),
      uuidv5(relativePath.slice(relativePath.lastIndexOf("/") + 1), uuidv5.URL),
    ).catch((err) => console.error(err)),
  );
tasksQueue.on("error", (err) => console.log(err));
tasksQueue.once("add", () => {
  const timeout =
    tasksQueue.size > 0 &&
    setInterval(() => {
      console.log("Pending tasks : ", tasksQueue.size);
      if (tasksQueue.size == 0) clearInterval(timeout);
    }, 1000);
});
