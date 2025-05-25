import express from "express";
import { env } from "node:process";
import cors from "cors";
//import helmet from "helmet";
import { deleteTags, getTags, patchTags, postTags } from "./tagsHandlers.js";
import {
  deleteBooks,
  deleteBooksBulkDelete,
  getBooks,
  getBooksMultiTagger,
  patchBooks,
} from "./booksHandlers.js";

export default function getExpressApp() {
  const app = express();
  app.use(cors({ origin: "*" }));
  app.use("/images", express.static(env.THUMBNAIL_FOLDER));
  app.use("/pdfs", express.static(env.FOLDER_PATH));
  app.use(express.json());

  app.get("/tags", getTags);
  app.post("/tags", postTags);
  app.patch("/tags", patchTags);
  app.delete("/tags", deleteTags);

  app.get("/books", getBooks);
  app.patch("/books", patchBooks);
  app.delete("/books/bulkdelete", deleteBooksBulkDelete);
  app.delete("/books/:id", deleteBooks);
  app.get("/books/multiTagger/:path?", getBooksMultiTagger);

  return app;
}
