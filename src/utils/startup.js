import { env } from "node:process";

if (!env.FOLDER_PATH.endsWith("/")) env.FOLDER_PATH += "/";
if (!env.THUMBNAIL_FOLDER.endsWith("/")) env.THUMBNAIL_FOLDER += "/";
