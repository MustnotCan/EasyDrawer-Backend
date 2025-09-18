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
import path, { join } from "node:path";
import { v5 as uuidv5 } from "uuid";
import PdfFile from "../utils/pdfClass.js";
import { nbrofFiles } from "../main.js";

export async function getBooks(req, res) {
  try {
    let take = Number.parseInt(req.query.take, 10) || 10;
    let pageNumber = Number.parseInt(req.query.pn, 10) || 1;
    if (isNaN(pageNumber) || pageNumber < 1) {
      pageNumber = 1;
    }
    let isAnd = req.query.isAnd == "false" ? false : true;
    let orderByCriteria = req.query.oB;
    let orderByDirection = req.query.direction;
    let tagsToFilterBy = [];
    let reqTags = req.query.tags;
    if (reqTags && typeof reqTags == "string") {
      tagsToFilterBy.push(...reqTags.split(","));
    }
    const searchName = req.query.searchName || "";
    let result = await getBooksFromDB(
      take,
      pageNumber,
      tagsToFilterBy,
      searchName,
      isAnd,
      orderByCriteria,
      orderByDirection,
    );

    const data = result.map((res) => {
      return {
        id: res.id,
        title: res.title,
        thumbnail: uuidv5(res.title, uuidv5.URL) + ".webp",
        tags: res.tags,
        path: res.path,
        lastAccess: res.lastAccess,
        lastModified: res.lastModified,
        addedDate: res.addedDate,
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
        path: res.path,
        addedDate: res.addedDate,
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
    console.log(e);
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
      req.body.files.map(async (file) => {
        const pdfInstance = PdfFile.fromFileSystem(file);
        await rm(pdfInstance.fullPath);
        return await deleteBooksByPathandName(
          pdfInstance.relativePath,
          pdfInstance.name,
        );
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
  const newRelativePath =
    req.body.dir[0] == "/" ? req.body.dir.slice(1) : req.body.dir || "";
  let promises;
  if (req.body.paths) {
    const paths =
      typeof req.body.paths === "string" ? [req.body.paths] : req.body.paths;
    promises = files.map(async (file, index) => {
      const nameAndRPath = PdfFile.getNameAndRelativePath(
        path.join(newRelativePath, paths[index]),
      );
      const dir = path.join(env.FOLDER_PATH, nameAndRPath.relativePath);
      try {
        await readdir(dir);
      } catch (e) {
        if (e.code === "ENOENT") {
          await mkdir(dir, { recursive: true });
        }
      }
      const dest = PdfFile.getFullPath(
        nameAndRPath.name,
        nameAndRPath.relativePath,
      );

      await writeFile(dest, file.buffer);
      const pdfInstance = PdfFile.fromFileSystem(
        path.join(nameAndRPath.relativePath, nameAndRPath.name),
      );
      queue.push(pdfInstance);
    });
  } else {
    promises = files.map(async (file) => {
      const nameAndRPath = PdfFile.getNameAndRelativePath(
        path.join(
          newRelativePath,
          Buffer.from(file.originalname, "latin1").toString("utf8"),
        ),
      );
      await writeFile(
        PdfFile.getFullPath(nameAndRPath.name, nameAndRPath.relativePath),
        file.buffer,
      );
      const pdfInstance = PdfFile.fromFileSystem(
        path.join(
          newRelativePath,
          Buffer.from(file.originalname, "latin1").toString("utf8"),
        ),
      );
      queue.push(pdfInstance);
    });
  }
  await Promise.all(promises);
  const qq = [...queue];

  await PdfFile.addFilesToDb(qq);
  const fullPaths = qq.map((file) => path.join(file.relativePath, file.name));
  nbrofFiles.nbrofFiles += fullPaths.length;
  const copier = new copyRun();

  await copier.startCopyingFilesToRam(fullPaths);
  if (flagger.flag == false) flagger.flag = true;
  await copier.startGeneratingThumbnails();

  const addedBooksPromises = queue.map(async (q) => {
    const res = await findBooksByPathAndTitle(q.name, q.relativePath);
    return res;
  });
  fsDirs = await groupByPath();
  const tmp = await Promise.all(addedBooksPromises);
  const addedBooks = tmp.map((file) => ({
    ...file,
    thumbnail: uuidv5(file.title, uuidv5.URL) + ".webp",
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
    thumbnail: uuidv5(file.title, uuidv5.URL) + ".webp",
  }));
  fsDirs = await groupByPath();
  res.status(200).json(movedBooks);
}
