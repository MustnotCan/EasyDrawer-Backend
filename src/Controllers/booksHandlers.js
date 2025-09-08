import { writeFile, mkdir, readdir, rm, copyFile } from "node:fs/promises";
import {
  deleteBookById,
  getBooksFromDB,
  changeTagsToBooks,
  groupByPath,
  findBooksByPath,
  getDistinctFilteredBooksNumber,
  getFilesFromSelectedAndUnselected,
  changeTagsToMultipleBooks,
  deleteBooksByPathandName,
  findBooksByPathAndTitle,
  updateBooksPaths,
} from "../db/bookModel.js";
let fsDirs = null;
import { env } from "node:process";
import { flagger } from "../utils/runGen.js";
import copyRun from "../utils/syncCopyRun.js";
import { join } from "node:path";
import { v5 as uuidv5 } from "uuid";

export async function getBooks(req, res) {
  let tagsToFilterBy = [];
  let reqTags = req.query.tags;
  if (reqTags && typeof reqTags == "string") {
    tagsToFilterBy.push(...reqTags.split(","));
  }
  const searchName = req.query.searchName || "";
  try {
    let take = Number.parseInt(req.query.take, 10) || 10;
    let pageNumber = Number.parseInt(req.query.pn, 10) || 1;
    if (isNaN(pageNumber) || pageNumber < 1) {
      pageNumber = 1;
    }
    let allTagsInBooks = Boolean(req.query.allTagsInBooks) || true;
    let result = await getBooksFromDB(
      take,
      pageNumber,
      tagsToFilterBy,
      searchName,
      allTagsInBooks,
    );
    const data = result.map((res) => {
      return {
        id: res.id,
        title: res.title,
        thumbnail: uuidv5(res.title, uuidv5.URL) + ".webp",
        tags: res.tags,
        path: res.path,
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
}
export async function patchBooks(req, res) {
  try {
    const { tags, title: nameBook } = req.body;

    if (!tags || !nameBook) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const addedTags = tags.filter((tag) => tag.action === "add") || [];
    const removedTags = tags.filter((tag) => tag.action === "remove") || [];

    const response = await changeTagsToBooks(addedTags, removedTags, nameBook);
    res.status(200).json(response);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
}
export async function getFilesMultiTagger(req, res) {
  if (!fsDirs) fsDirs = await groupByPath();
  let paramsPath;
  if (req.params.path) {
    paramsPath = req.params.path;
  } else {
    paramsPath = "/";
  }
  try {
    const directories = fsDirs.filter((dir) => dir.path == paramsPath)[0]
      .subpaths;
    const pdfs = await findBooksByPath(paramsPath);
    const pdfsWithDetails = pdfs.map((res) => {
      return {
        id: res.id,
        title: res.title,
        thumbnail: uuidv5(res.title, uuidv5.URL) + ".webp",
        tags: res.tags,
        path: res.path,
        lastOpened: res.lastOpened,
      };
    });
    res.status(200).json({
      dirs: [...directories],
      files: [...pdfsWithDetails],
    });
  } catch (e) {
    if (e.code == "ENOENT") {
      console.log("Path do not exist");
      res.status(401).json({});
    }
    res.status(500).json({ error: e });
  }
}
export async function deleteBooks(req, res, next) {
  const id = req.params.id;
  if (id == "multiTagger") {
    next();
    return;
  }

  try {
    const response = await deleteBookById(id);
    res.status(201).json(response);
  } catch (e) {
    console.log("error while deleting a book by id: ", e);
    res.status(400);
  }
}

export async function getBooksMultiTagger(req, res) {
  if (!req.body.selected || !req.body.unselected) {
    res.status(400).json({ error: "selected or unselected items are missing" });
  }
  const selected = req.body.selected;
  const unselected = req.body.unselected;
  const selectedFolders = [];
  const selectedFiles = [];
  const unselectedFolders = [];

  const unselectedFiles = [];
  selected.forEach((element) => {
    if (element.endsWith("pdf")) {
      selectedFiles.push(
        element.slice(0, 2) == "//"
          ? element.slice(1, element.length)
          : element,
      );
    } else {
      selectedFolders.push(element);
    }
  });
  unselected.forEach((element) => {
    if (element.endsWith("pdf")) {
      unselectedFiles.push(
        element.slice(0, 2) == "//"
          ? element.slice(1, element.length)
          : element,
      );
    } else {
      unselectedFolders.push(element);
    }
  });
  const response = await getFilesFromSelectedAndUnselected(
    selectedFolders,
    unselectedFolders,
    selectedFiles,
    unselectedFiles,
    true,
  );
  if (!response) res.status(201).json([]);
  res.status(201).json(response);
}
export async function changeBooksTagsMultiTagger(req, res) {
  try {
    const { tags, titles: namesBooks } = req.body;

    if (!tags || !namesBooks) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const addedTags = tags.filter((tag) => tag.action === "add") || [];
    const removedTags = tags.filter((tag) => tag.action === "remove") || [];
    const response = await changeTagsToMultipleBooks(
      addedTags,
      removedTags,
      namesBooks,
    );
    res.status(200).json(response);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
}
export async function deleteBooksBulkDelete(req, res) {
  if (!req.body.files) {
    res.status(400).json({ error: "files to delete are missing" });
  }
  try {
    await Promise.all(
      req.body.files.map((file) => {
        const lastIndexOfSlash = file.lastIndexOf("/");
        if (lastIndexOfSlash == 0) {
          rm(env.FOLDER_PATH + file.slice(1));
          return deleteBooksByPathandName(file.slice(0, 1), file.slice(1));
        } else {
          rm(env.FOLDER_PATH + file);
          return deleteBooksByPathandName(
            file.slice(0, lastIndexOfSlash),
            file.slice(lastIndexOfSlash + 1),
          );
        }
      }),
    );
    fsDirs = await groupByPath();
    res.status(200).json({ files: req.body.files });
  } catch (e) {
    console.log(e);
  }
}

export async function importFiles(req, res) {
  const files = req.files;
  const queue = [];
  const path = req.body.dir || "";
  let promises;
  if (req.body.paths) {
    const paths =
      typeof req.body.paths === "string" ? [req.body.paths] : req.body.paths;
    promises = files.map(async (file, index) => {
      const dir =
        env.FOLDER_PATH +
        (path != "" ? path.slice(1) + "/" : "") +
        paths[index].slice(0, paths[index].lastIndexOf("/"));
      try {
        await readdir(dir);
      } catch (e) {
        if (e.code === "ENOENT") {
          await mkdir(dir, { recursive: true });
        }
      }
      await writeFile(
        env.FOLDER_PATH +
          (path != "" ? path.slice(1) + "/" : "") +
          paths[index],
        file.buffer,
      );
      queue.push((path != "" ? path.slice(1) + "/" : "") + paths[index]);
    });
  } else {
    promises = files.map(async (file) => {
      const rp =
        (path != "" ? path.slice(1) + "/" : "") +
        Buffer.from(file.originalname, "latin1").toString("utf8");
      await writeFile(env.FOLDER_PATH + rp, file.buffer);
      queue.push(rp);
    });
  }
  await Promise.all(promises);
  const copier = new copyRun();
  const qq = [...queue];
  copier.startCopyingFilesToRam(qq);
  if (flagger.flag == false) flagger.flag = true;
  await copier.startGeneratingThumbnails(qq.length);

  const addedBooksPromises = queue.map((q) => {
    const lastIndexOfSlash = q.lastIndexOf("/");
    if (lastIndexOfSlash != -1) {
      const title = q.slice(lastIndexOfSlash + 1);
      const path = "/" + q.slice(0, lastIndexOfSlash);
      console.log(title, path);
      return findBooksByPathAndTitle(title, path);
    } else {
      return findBooksByPathAndTitle(q, "/");
    }
  });
  fsDirs = await groupByPath();
  const addedBooks = (await Promise.all(addedBooksPromises)).map((file) => ({
    ...file,
    thumbnail: file.id + ".webp",
  }));
  res.status(200).json(addedBooks);
}
export async function moveFiles(req, res) {
  if (!req.body.files || !req.body.newPath)
    res.status(400).json({ error: "Files or new Path are missing" });
  const files = req.body.files;
  const newPath = req.body.newPath;
  const promises = files.map(async (file) => {
    const lastIndexOfSlash = file.lastIndexOf("/");
    if (lastIndexOfSlash != -1) {
      const title = file.slice(lastIndexOfSlash + 1);
      const path = file.slice(0, lastIndexOfSlash) || "/";
      try {
        await readdir(join(env.FOLDER_PATH, newPath));
      } catch (e) {
        if (e.code === "ENOENT") {
          await mkdir(join(env.FOLDER_PATH, newPath), { recursive: true });
        }
      }
      await copyFile(
        join(env.FOLDER_PATH, file),
        join(env.FOLDER_PATH, join(newPath, title)),
      );
      await rm(join(env.FOLDER_PATH, file));
      return updateBooksPaths(title, path, newPath);
    }
  });

  const movedBooks = (await Promise.all(promises)).map((file) => ({
    ...file,
    thumbnail: file.id + ".webp",
  }));
  fsDirs = await groupByPath();
  res.status(200).json(movedBooks);
}
