import fs from "node:fs/promises";
import path from "path";
import pLimit from "p-limit";
import { cpus } from "node:os";
import runInWorker from "./runner.js";
const workerLimit = pLimit(cpus().length);

export default async function addingThumbnails(dir) {
  const start = Date.now();
  await thumbnailFilesInDir(dir);
  console.log("All tasks were processed");
  const elapsed = Date.now() - start; // Calculate elapsed time
  const minutes = Math.floor(elapsed / 60000); // Convert milliseconds to minutes
  const seconds = ((elapsed % 60000) / 1000).toFixed(2); // Convert remaining milliseconds to seconds
  console.log(`${minutes} minutes and ${seconds} seconds`);
}
async function thumbnailFilesInDir(dir) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    const dirsInDir = files.filter((file) => file.isDirectory());
    const filesInDir = files.filter(
      (file) => file.isFile() && path.parse(file.name).ext == ".pdf",
    );
    for (const subDir of dirsInDir) {
      await thumbnailFilesInDir(path.join(dir, subDir.name));
    }
    await Promise.all(
      filesInDir.map((file) =>
        thumbnailFile(path.join(file.parentPath, file.name)),
      ),
    );
  } catch (err) {
    if (err.code === "EACCES") {
      console.log(`Permission denied: ${dir}, skipping...`);
      return;
    }
    throw err;
  }
}
export async function thumbnailFile(file) {
  const parsedPath = path.parse(file);
  if (parsedPath.ext != ".pdf") {
    console.error(Error(`${file} is not a pdf`));
    return;
  }
  const resolvedPath = path.resolve(file);
  try {
    return workerLimit(() => runInWorker(parsedPath.name, resolvedPath));
  } catch (err) {
    console.log(err);
  }
}
