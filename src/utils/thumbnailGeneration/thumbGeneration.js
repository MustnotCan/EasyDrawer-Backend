import { env } from "node:process";
import fs from "node:fs/promises";
import { exec } from "child_process";
import path from "path";

export async function queueHandling(queue) {
  try {
    await Promise.all(
      queue.map((file) => savePdfThumbnail(file.filePath, file.uuid)),
    );
  } catch (e) {
    console.log(e);
  }
}
async function savePdfThumbnail(pdfPath, uuid) {
  const filePath = path.join(env.THUMBNAIL_FOLDER, uuid);

  try {
    await fs.access(filePath);
    return filePath;
  } catch (err) {
    if (err.code === "ENOENT") {
      const outputBase = filePath.replace(/\.webp$/, "");
      const generatedPng = `${outputBase}.ppm`;
      const webpFile = `${filePath}.webp`;
      try {
        await new Promise((resolve) => {
          exec(
            `pdftoppm -f 1 -l 1 -singlefile -cropbox "${pdfPath}" "${outputBase}" && cwebp -q 100 -resize 250 300 "${generatedPng}" -o "${webpFile}" && rm "${outputBase}.ppm"`,
            (error, stdout) => {
              resolve(stdout);
            },
          );
        });
        await fs.rm(pdfPath);
        console.log("thumbnail generated and saved in : ", webpFile);
      } catch {
        console.log("Yes error happened and moving !");
      }
    } else {
      console.log("Unexpected error:", err);
      return null;
    }
  }
}
