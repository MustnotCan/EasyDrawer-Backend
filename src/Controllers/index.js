import express from "express";
import { env } from "node:process";
import cors from "cors";
//import helmet from "helmet";
import { deleteTags, getTags, patchTags, postTags } from "./tagsHandlers.js";
import {
  deleteBooks,
  deleteBooksBulkDelete,
  getBooks,
  getFilesMultiTagger,
  patchBooks,
  changeBooksTagsMultiTagger,
  getBooksMultiTagger,
  importFiles,
  moveFiles,
} from "./booksHandlers.js";
import multer from "multer";
import { servePdf } from "../utils/utils.js";

const storage = multer.memoryStorage();
const mult = multer({ storage: storage });

export default function getExpressApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(cors({ origin: "*" }));
  app.use("/images", express.static(env.THUMBNAIL_FOLDER));
  app.use("/pdfs/:id", servePdf);
  app.use(express.json());

  app.get("/tags", getTags);
  app.post("/tags", postTags);
  app.patch("/tags", patchTags);
  app.delete("/tags", deleteTags);

  app.get("/books", getBooks);
  app.patch("/books", patchBooks);
  app.delete("/books/:id", deleteBooks);
  app.get("/books/multiTagger/:path?", getFilesMultiTagger);
  app.post("/books/multiTagger/tags", getBooksMultiTagger);
  app.patch("/books/multiTagger/updatetags", changeBooksTagsMultiTagger);
  app.delete("/books/multiTagger", deleteBooksBulkDelete);
  app.post("/books/multiTagger/importfile", mult.array("files"), importFiles);
  app.patch("/books/multiTagger/moveFiles", moveFiles);

  return app;
}
