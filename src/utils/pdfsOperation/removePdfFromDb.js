import { removeByPath } from "../../db/index.js";
import { configDotenv } from "dotenv";
import { env } from "node:process";
configDotenv();
export async function removePdfFromDb(filePath) {
  const relativePath = filePath.slice(env.FOLDER_PATH.length, filePath.length);
  console.log(relativePath);
  await removeByPath(relativePath);
}
