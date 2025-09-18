import { env } from "node:process";
import { clearnShm } from "./utils/cleanup.js";

if (!env.FOLDER_PATH.endsWith("/")) env.FOLDER_PATH += "/";
if (!env.THUMBNAIL_FOLDER.endsWith("/")) env.THUMBNAIL_FOLDER += "/";
await clearnShm();
