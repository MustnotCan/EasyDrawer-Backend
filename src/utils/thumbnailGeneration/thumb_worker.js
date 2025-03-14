import { parentPort, workerData } from "worker_threads";
import { env } from "node:process";
import { configDotenv } from "dotenv";
import fs from "node:fs/promises";
import { exec } from "child_process";
import path from "path";

configDotenv();
async function savePdfThumbnail(name, pdfPath) {
  const filePath = path.join(
    env.THUMBNAIL_FOLDER,
    name.replace(/\.pdf$/, ".webp"),
  );

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
          `pdftoppm -f 1 -l 1 -singlefile "${pdfPath}" "${outputBase}" && cwebp "${generatedPng}" -o "${webpFile}" && rm "${outputBase}.ppm"`,
          (error, stdout, stderr) => {
            if (error) {
              console.log("Error during thumbnail generation:", error);
              console.log("stderr:", stderr);
              reject(error);
              return;
            }
            resolve(webpFile);
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

savePdfThumbnail(workerData.name, workerData.path)
  .then(() => {
    //parentPort.postMessage(`${workerData.name} Thumbnail saved successfully!`);
  })
  .catch((err) => {
    parentPort.postMessage(`Error: ${err.message}`);
  });
