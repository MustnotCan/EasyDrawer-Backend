import { addPdfToDb } from "./pdfsOperation/addPdfToDb.js";
import { env } from "node:process";
import path from "path";
import { v5 as uuidv5 } from "uuid";
import { statSync } from "node:fs";
export default class PdfFile {
  constructor(
    name,
    relativePath,
    fullPath,
    lastAccess,
    lastModified,
    addedDate,
  ) {
    // CSS-Cheat-Sheet.pdf
    this.name = name;
    // /Unclassified
    this.relativePath = relativePath;
    this.fullPath = !fullPath
      ? path.join(env.FOLDER_PATH, relativePath, name)
      : fullPath;
    this.lastAccess = !lastAccess ? statSync(this.fullPath).atime : lastAccess;
    this.lastModified = !lastModified
      ? statSync(this.fullPath).mtime
      : lastModified;
    this.addedDate = !addedDate ? new Date(Date.now()) : addedDate;
    this.uuid = uuidv5(relativePath + name, uuidv5.URL);
    this.thumbnail = uuidv5(name, uuidv5.URL);
  }
  // Unclassified/aaaah/CSS-Cheat-Sheet.pdf
  static getNameAndRelativePath(relativePathWithName) {
    relativePathWithName =
      relativePathWithName[0] == "/"
        ? relativePathWithName.slice(1)
        : relativePathWithName;
    const lastIndexOf = relativePathWithName.lastIndexOf("/");
    let name;
    let relativePath;
    if (lastIndexOf != -1) {
      name = relativePathWithName.slice(lastIndexOf + 1);
      relativePath = "/" + relativePathWithName.slice(0, lastIndexOf);
    } else {
      name = relativePathWithName;
      relativePath = "/";
    }
    return { name: name, relativePath: relativePath };
  }
  static getFullPath(name, relativePath) {
    return path.join(env.FOLDER_PATH, relativePath, name);
  }
  static fromFileSystem(relativePathWithName) {
    const { name, relativePath } =
      this.getNameAndRelativePath(relativePathWithName);
    return new PdfFile(name, relativePath);
  }

  // files must be an array of pdfFile class instances
  static async addFilesToDb(files) {
    files.forEach((file) => addPdfToDb(file));
  }
}
