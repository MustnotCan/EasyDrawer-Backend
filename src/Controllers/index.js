import express from "express";
import {
  addTagsToBooks,
  deleteBooksByName,
  getBooksFromDB,
  deleteBookById,
  getDistinctFilteredBooksNumber,
  removeTagsFromBooks,
} from "../db/bookModel.js";
import {
  getAllTags,
  addTag,
  deleteTagByName,
  renameTag,
} from "../db/tagModel.js";
import { configDotenv } from "dotenv";
import { env } from "node:process";
import cors from "cors";
import { filesAndDirs } from "../utils/multiTagger.js";
//import helmet from "helmet";

configDotenv();
export default function getExpressApp() {
  const app = express(); //app.use(helmet());
  app.use("/images", express.static(env.THUMBNAIL_FOLDER));
  app.use("/pdfs", express.static(env.FOLDER_PATH));
  app.use(cors({ origin: "*" }));
  app.use(express.json());
  app.get("/tags", async (req, res) => {
    try {
      const tags = await getAllTags();
      const returned = [];
      for (const tag of tags) {
        returned.push({ id: tag.id, name: tag.name });
      }

      res.status(200).json(returned);
    } catch (error) {
      res(500).json({ error: error });
    }
  });
  app.post("/books", async (req, res) => {
    const tagsToFilterBy = req.body.tags || [];
    const searchName = req.body.searchName || "";
    try {
      var take = Number.parseInt(req.query.take, 10) || 10;
      var pageNumber = Number.parseInt(req.query.pn, 10) || 1;

      if (isNaN(pageNumber) || pageNumber < 1) {
        pageNumber = 1;
      }
      var result = await getBooksFromDB(
        take,
        pageNumber,
        tagsToFilterBy,
        searchName,
      );
      const data = result.map((res) => {
        return {
          id: res.id,
          title: res.title,
          thumbnail: res.id + ".webp",
          tags: res.tags,
          path: res.path,
          like: res.like,
          markForLater: res.markForLater,
          lastOpened: res.lastOpened,
        };
      });
      const countBooksInDb = await getDistinctFilteredBooksNumber(
        tagsToFilterBy,
        searchName,
      );
      const count = Math.ceil(countBooksInDb / take);
      const toSend = {
        data: data,
        count: count || 0,
        take: take,
        pn: pageNumber,
      };

      res.status(200).json(toSend);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  app.post("/tags", async (req, res) => {
    const tag = req.body;
    try {
      const response = await addTag(tag.name);
      res.status(201).json(response);
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  });
  app.patch("/tags", async (req, res) => {
    const body = req.body.body;
    try {
      const response = await renameTag(body.prevTagName, body.newTagName);
      res.status(201).json(response);
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  });
  app.delete("/tags", async (req, res) => {
    const tag = req.body;
    try {
      const response = await deleteTagByName(tag.name);
      res.status(200).json(response);
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  });

  app.patch("/books", async (req, res) => {
    try {
      const { tags, title: nameBook, action } = req.body;

      if (!tags || !nameBook || !action) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let response;
      if (action === "add") {
        response = await addTagsToBooks(tags, nameBook);
      } else if (action === "remove") {
        response = await removeTagsFromBooks(tags, nameBook);
      } else {
        return res
          .status(400)
          .json({ error: "Invalid action, use 'add' or 'remove'" });
      }

      res.status(200).json(response);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  });
  app.delete("/books/bulkdelete", async (req, res) => {
    const title = req.body.title;
    if (!title) {
      return res.status(400).json({ error: "no title in the body request" });
    }
    try {
      const response = await deleteBooksByName(title);
      res.status(201).json(response);
    } catch (e) {
      console.log("error while deleting a book by id: ", e);
      res.status(400).json({ error: "Error when deleting books by name" });
    }
  });
  app.delete("/books/:id", async (req, res) => {
    const id = req.params.id;

    try {
      const response = await deleteBookById(id);
      res.status(201).json(response);
    } catch (e) {
      console.log("error while deleting a book by id: ", e);
      res.status(400);
    }
  });
  app.get("/books/:path", (req, res) => {
    const paramsPath = req.params.path;
    if (paramsPath) {
      try {
        const dirMap = filesAndDirs(paramsPath);
        const directories = dirMap.get("directories");
        const pdfs = dirMap.get("pdfs");
        res.status(200).json({ dirs: [...directories], files: [...pdfs] });
      } catch (e) {
        if (e.code == "ENOENT") {
          console.log("Path do not exist");
          res.status(401).json({});
        }
      }
    } else {
      res.status(400).json({ error: "no path specified" });
    }
  });
  return app;
}
