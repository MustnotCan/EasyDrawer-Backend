import { workerData } from "worker_threads";
import { env } from "node:process";
import { configDotenv } from "dotenv";
import fs from "node:fs/promises";
import { exec } from "child_process";
import path from "path";

configDotenv();
export function queueHandling(queue) {
  for (const file of queue.files) {
    try {
      savePdfThumbnail(file.filePath, file.uuid);
      //console.log("still in queue: ",queue.number, queue.files.length, " files");
    } catch (e) {
      throw new Error(e);
    }
  }
  console.log("Queue: ", queue.number, " just finished");
}
async function savePdfThumbnail(pdfPath, uuid) {
  const filePath = path.join(env.THUMBNAIL_FOLDER, uuid);

  try {
    await fs.access(filePath);
    return filePath;
  } catch (err) {
    if (err.code === "ENOENT") {
      return new Promise((resolve, reject) => {
        const outputBase = filePath.replace(/\.webp$/, "");
        const generatedPng = `${outputBase}.ppm`;
        const webpFile = `${filePath}.webp`;
        exec(
          `pdftoppm -f 1 -l 1 -singlefile -cropbox "${pdfPath}" "${outputBase}" && cwebp -q 100 -resize 250 300 "${generatedPng}" -o "${webpFile}" && rm "${outputBase}.ppm"`,
          (error, stdout, stderr) => {
            if (error) {
              console.log("Error during thumbnail generation:", error);
              console.log("stderr:", stderr);
              reject(error);
              return;
            }
          },
        );
      }).catch((error) => {
        console.log("Error in thumbnail generation process:", error);
        return null;
      });
    }
    console.log("Unexpected error:", err);
    return null;
  }
}

/*savePdfThumbnail(workerData.resolvedPath, workerData.uuid).catch((err) => {
  parentPort.postMessage(`Error: ${err.message}`);
});
*/
queueHandling(workerData.queue);
