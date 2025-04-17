import { EventEmitter } from "events";
import { statSync } from "fs";
import { cp } from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { configDotenv } from "dotenv";
configDotenv();

export default class copyRun extends EventEmitter {
  constructor() {
    super();
    this.done = false;
    this.keepLooping = true;
    this.on("Stop", () => {
      (this.done = true), (this.keepLooping = false);
    });
  }
  getShmFreeBytes() {
    try {
      const df = execSync("df --output=avail /dev/shm").toString().split("\n");
      const kbFree = parseInt(df[1].trim(), 10);
      return kbFree * 1024; // convert to bytes
    } catch (err) {
      if (err.signal === "SIGINT") {
        console.warn(
          "df was interrupted by SIGINT. Gracefully shutting down...",
        );
        return undefined; // or rethrow or handle as needed
      }
    }
  }

  async checkRamThenCopy(file) {
    this.file = file;
    if (this.totalSize == undefined) {
      this.totalSize = statSync(this.file).size;
    }
    const freeshm = this.getShmFreeBytes();
    if (freeshm != undefined && freeshm > this.totalSize + 500 * 1024 * 1024) {
      //console.log("stated copying", file);
      try {
        await cp(this.file, path.join("/dev/shm/pdfManApp", this.file));
      } catch {
        if (this.done == true) {
          console.log("happened while exiting! normal");
        }
      }

      this.totalSize = undefined;
      this.canDelete = true;
    } else if (freeshm == undefined) {
      console.log("Exitting");
    } else {
      // 500MB buffer
      console.log("Waiting for shm space");
      await new Promise((res) => setTimeout(res, 5000));
      this.canDelete = false;
    }

    return;
  }
  async startOp(files) {
    while (files.length > 0 && this.keepLooping == true) {
      await this.checkRamThenCopy(files[0]);
      if (this.canDelete == true) {
        files.shift();
      }
    }
    this.done = true;
  }
}
