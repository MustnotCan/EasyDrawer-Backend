import { deleteBookByPath } from "../../db/bookModel.js";
import { configDotenv } from "dotenv";
configDotenv();
export async function removePdfFromDb(filePath) {
  console.log(filePath);
  await deleteBookByPath(filePath);
  //to:do remove thumnail when deleting book
}
