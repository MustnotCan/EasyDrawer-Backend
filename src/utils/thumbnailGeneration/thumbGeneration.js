import { env } from "node:process";
import fs from "node:fs/promises";
import { exec } from "child_process";
import path from "path";
import { nbrofFiles } from "../../main.js";
let nbrProcessed = 0;
/**
 * takes a queue of paths and start generation for each file
 * @param {string[]} queue
 * @returns {Promise<object[]>} thumbnailPaths
 */
export async function queueHandling(queue) {
  return await Promise.allSettled(
    queue.map((file) => savePdfThumbnail(file.filePath, file.uuid)),
  ).then(() => {
    nbrProcessed += queue.length;
    console.log(nbrofFiles.nbrofFiles, nbrProcessed);
    const state = Math.min(
      ((nbrProcessed / nbrofFiles.nbrofFiles) * 100).toFixed(0),
      100,
    );
    if (queue.length > 0) {
      console.log(`${state}% `);
      if (Number(state) < 100) {
        console.log("still generating ... \n");
      }
    }
  });
}

/**
 * generate thumbnail and returns its path
 * @param {string} pdfPath
 * @param {string} uuid
 * @returns {string} generated thumbnail path
 */
async function savePdfThumbnail(pdfPath, uuid) {
  const filePath = path.join(env.THUMBNAIL_FOLDER, uuid);
  const webpFile = `${filePath}.webp`;
  const outputBase = filePath.replace(/\.webp$/, "");
  const generatedPng = `${outputBase}.ppm`;
  await new Promise((resolve) => {
    exec(
      `pdftoppm -f 1 -l 1 -singlefile -cropbox "${pdfPath}" "${outputBase}" && cwebp -q 100 -resize 250 300 "${generatedPng}" -o "${webpFile}" && rm "${outputBase}.ppm"`,
      (err, stdout) => {
        if (err && err.code != 1) {
          console.error(
            `\n thumbnail generation failed for ${pdfPath.slice("/dev/shm/pdfManApp".length)}, likely the pdf file is invalid or corrupted :  `,
          );
          console.log(err);
        }
        resolve(stdout);
      },
    );
  });
  await fs.rm(pdfPath);
  return webpFile;
}
