import { statSync } from "fs";
import { cp, rename } from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { loop } from "./runGen.js";

export default class copyRun {
  constructor() {
    this.done = false;
    this.keepLooping = true;
  }

  getShmFreeBytes() {
    const df = execSync("df --output=avail /dev/shm").toString().split("\n");
    const kbFree = parseInt(df[1].trim(), 10);
    return kbFree * 1024; // convert to bytes
  }
  /**
   *
   * @param {string} file
   * @returns whether the file has been copied to ram
   */
  async copyFileToRam(file) {
    const localFile = path.join(process.env.FOLDER_PATH, file);
    // file : single/single/beautiful/Unclassified/CIN.pdf

    let totalSize = statSync(localFile).size;
    const freeshm = this.getShmFreeBytes();
    if (freeshm > totalSize + 500 * 1024 * 1024) {
      const destPath = path.join("/dev/shm/pdfManApp", file + ".partial");
      await cp(localFile, destPath);
      await rename(destPath, path.join("/dev/shm/pdfManApp", file));
      return true;
    } else {
      // 500MB buffer
      console.log("Waiting for shm space");
      await new Promise((res) => setTimeout(res, 5000));
      return false;
    }
  }

  /**
   * takes an array of pdf paths and push them to ram
   * @param {string[]} files
   */
  async startCopyingFilesToRam(files) {
    while (files.length != 0 && this.keepLooping) {
      let isCopied;
      let file = files[0];
      isCopied = await this.copyFileToRam(file);
      if (isCopied) {
        files.shift();
      }
    }
    this.done = true;
  }

  /**
   * start the process of generating thumbnails
   */
  async startGeneratingThumbnails() {
    while (!this.done) {
      await loop();
    }

    await loop();
    console.log("Thumbs ready...");
  }
}
