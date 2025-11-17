import { env } from "node:process";
import { exec } from "child_process";
import path from "path";

export const ac = new AbortController();

/**
 * generate thumbnail and returns its path
 * @param {string} pdfPath
 * @param {string} uuid
 */
export function savePdfThumbnail(pdfPath, uuid) {
  const filePath = path.join(env.THUMBNAIL_FOLDER, uuid);
  const webpFile = `${filePath}.webp`;
  const outputBase = filePath.replace(/\.webp$/, "");
  const generatedPng = `${outputBase}.ppm`;
  const emptyCover = "./src/assets/EmptyCover.ppm";
  return new Promise((resolve) => {
    exec(
      `pdftoppm -f 1 -l 1 -singlefile -scale-to-x 250 -scale-to-y 300 -cropbox "${pdfPath}" "${outputBase}" && cwebp -q 100 "${generatedPng}" -o "${webpFile}" && rm "${outputBase}.ppm"`,
      { signal: ac.signal, killSignal: "SIGKILL" },
      (err) => {
        if (err && err.code != 1 && err.code != "ABORT_ERR") {
          console.error(
            `\nThumbnail generation failed for ${pdfPath.slice(env.FOLDER_PATH.length)}, likely the pdf file is invalid or corrupted, generating an empty cover instead. `,
          );
          exec(
            `cwebp -q 100 -resize 250 300 "${emptyCover}" -o "${webpFile}" && rm ${generatedPng}`,
            () => resolve(),
          );
        } else {
          resolve();
        }
      },
    );
  });
}
