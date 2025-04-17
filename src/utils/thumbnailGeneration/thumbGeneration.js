import { env } from "node:process";
import { configDotenv } from "dotenv";
import fs from "node:fs/promises";
import { exec } from "child_process";
import path from "path";
configDotenv();
export async function queueHandling(queue) {
  for (const file of queue.files) {
    try {
      await savePdfThumbnail(file.filePath, file.uuid);
    } catch (e) {
      throw new Error(e);
    }
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
              if (!error) {
                console.log("Thumbnail generation completed.");
              }
              resolve(stdout); // Resolve when the command finishes
            },
          );
        });

        // This will only run after exec finishes successfully
        await fs.rm(pdfPath);
        //console.log(`Deleted PDF: ${pdfPath}`);
      } catch {
        console.log("Yes error happened and moving !");
      }
    } else {
      console.log("Unexpected error:", err);
      return null;
    }
  }
}
