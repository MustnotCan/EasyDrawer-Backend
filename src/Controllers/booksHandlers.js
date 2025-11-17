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
  updateBooksPaths,
  findBooksByTags,
  findBookById,
  updateIndexes,
  removeIndex,
  deleteBooksByTag,
  findBooksByPathAndTitle,
} from "../db/bookModel.js";
import { env } from "node:process";
import { join } from "node:path";
import { v5 as uuidv5 } from "uuid";
import PdfFile from "../utils/pdfClass.js";
import extractText from "../utils/extractTextContentWithPython.js";
import { Meilisearch } from "meilisearch";
import ndjson from "ndjson";
import zlib from "zlib";
import { generateEntryFromFile, generateOpds } from "../utils/opds.js";
import { randomUUID } from "node:crypto";
import { addThumbnailGenerationTask } from "../utils/tasksQueue.js";
import { addPdfToDb } from "../utils/addPdfToDb.js";
import { getPagesByBook } from "../db/pageModel.js";
import { addPageToTextContext } from "../db/pageModel.js";
import { tasksQueue } from "../utils/tasksQueue.js";

export const client = process.env.MEILISEARCH_API
  ? new Meilisearch({ host: process.env.MEILISEARCH_API })
  : null;

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
      isAnd,
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
    const { tags, path: path } = req.body;

    if (!tags || !path) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const addedTags = tags.filter((tag) => tag.action === "add") || [];
    const removedTags = tags.filter((tag) => tag.action === "remove") || [];

    const response = await changeTagsToBooks(addedTags, removedTags, path);
    res.status(200).json(response);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
}
export async function getFilesMultiTagger(req, res) {
  const paramsPath = req.params.path ? req.params.path : "/";
  const fsDirs = await groupByPath(paramsPath);

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
export async function getBooksFromSelected(req, res) {
  if (!req.body.selected) {
    res.status(300).json({ error: "NO selected files shared" });
    return;
  }
  const selected = req.body.selected;
  const promises = selected.map((path) => {
    const lastIndexOfSlash = path.lastIndexOf("/");
    const relativePath = path.slice(0, lastIndexOfSlash);
    const title = path.slice(lastIndexOfSlash + 1);
    return findBooksByPathAndTitle(title, relativePath);
  });
  const result = await Promise.all(promises);
  res.status(200).json(result);
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
    const jsonResponse = response.map((res) => ({
      fullpath: join(res.path, res.title),
      tags: res.tags,
    }));
    res.status(200).json(jsonResponse);
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
    res.status(200).json({ files: req.body.files });
  } catch (e) {
    console.log(e);
  }
}
const counter = { index: {}, import: {} };
export async function importFiles(req, res) {
  const files = req.files;
  const newKey = Number(Object.keys(counter.import).at(-1) || 0) + 1;
  counter.import[newKey] = { total: files.length, current: 0 };
  const newRelativePath =
    req.body.dir[0] == "/" ? req.body.dir.slice(1) : req.body.dir || "";
  let paths;
  if (req.body.paths) {
    paths =
      typeof req.body.paths === "string" ? [req.body.paths] : req.body.paths;
  }
  const promises = files.map(async (file, index) => {
    let nameAndRPath;
    if (Array.isArray(paths) && paths[index]) {
      nameAndRPath = PdfFile.getNameAndRelativePath(
        join(newRelativePath, paths[index]),
      );
      const dir = join(env.FOLDER_PATH, nameAndRPath.relativePath);
      try {
        await readdir(dir);
      } catch (e) {
        if (e.code === "ENOENT") {
          await mkdir(dir, { recursive: true });
        }
      }
    } else {
      nameAndRPath = PdfFile.getNameAndRelativePath(
        join(
          newRelativePath,
          Buffer.from(file.originalname, "latin1").toString("utf8"),
        ),
      );
    }
    const dest = PdfFile.getFullPath(
      nameAndRPath.name,
      nameAndRPath.relativePath,
    );
    let pdfInstance;
    try {
      await writeFile(dest, file.buffer);
      pdfInstance = PdfFile.fromFileSystem(
        join(nameAndRPath.relativePath, nameAndRPath.name),
      );
      await addPdfToDb(pdfInstance);
      await addThumbnailGenerationTask(
        join(pdfInstance.relativePath, pdfInstance.name),
      );

      counter.import[newKey]["current"] += 1;
      seeListeners.forEach((listener) => {
        listener.write(
          `event: successImport\n` +
            `data: ${JSON.stringify({
              current: counter.import[newKey].current,
              total: counter.import[newKey].total,
              setNumber: newKey,
              fileTitle: pdfInstance.name,
              addedFileDetails: {
                relativepath: pdfInstance.relativePath,
                uuid: pdfInstance.uuid,
                thumbnail: pdfInstance.thumbnail,
                addedDate: pdfInstance.addedDate,
              },
            })}\n\n`,
        );
      });
    } catch (err) {
      seeListeners.forEach((listener) => {
        listener.write(
          `event: failedImport\n` +
            `data: ${JSON.stringify({ current: counter.import[newKey].current, total: counter.import[newKey].total, setNumber: newKey, error: err, fileTitle: pdfInstance.name })}\n\n`,
        );
      });
    }
  });

  Promise.allSettled(promises);
  res.status(200).json({ status: "Import tasks started" });
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
  res.status(200).json(movedBooks);
}
let seeListeners = [];
let pendingMeiliTasks = [];
let indexingPending = {};
export async function index_files(req, res) {
  if (!req.body.tag || !req.body.index || client == null) {
    res.status(400).json({
      error:
        "Please check that the request contains both the index uid and the tag to index",
    });
    return;
  }
  const index = req.body.index;
  const indexedClient = client.index(index);
  const tag = req.body.tag;
  const foundBooksIntags = await findBooksByTags([tag], false, true);
  const notAlreadyIndexed = foundBooksIntags.filter(
    (book) => !book.indexes.includes(index),
  );
  const newKey = Number(Object.keys(counter.index).at(-1) || 0) + 1;
  if (notAlreadyIndexed.length == 0) {
    res.status(200).json({
      message: `All files with tag ${tag} are indexed within ${index}`,
    });
    return;
  } else {
    notAlreadyIndexed.forEach((ip) => (indexingPending[ip.id] = ip.title));
    counter.index[newKey] = { total: notAlreadyIndexed.length, current: 0 };
  }
  let withTextExtracted = [];
  let withoutTextExtracted = [];
  notAlreadyIndexed.forEach((book) =>
    book.textExtracted
      ? withTextExtracted.push(book)
      : withoutTextExtracted.push(book),
  );
  let documentPromises = [];
  if (withTextExtracted.length > 0) {
    const extractedPagesPromises = withTextExtracted.map((book) =>
      getPagesByBook(book.id).then((bookPages) =>
        bookPages.map((page) => ({
          content: page["text"],
          page: page["pageNumber"],
          fileId: page["fileId"],
          id: page["id"],
        })),
      ),
    );
    documentPromises.push(...extractedPagesPromises);
  }
  if (withoutTextExtracted.length > 0) {
    documentPromises.push(
      ...withoutTextExtracted.map((file) =>
        tasksQueue.add(() =>
          extractText(join(env.FOLDER_PATH + file.path, file.title), file.id)
            .then((documents) => {
              if (documents.length > 0) {
                addPageToTextContext(documents, file.id);
                return documents;
              } else {
                counter.index[newKey].current += 1;
                console.error(
                  "Extracted 0 pages from : ",
                  join(file.path, file.title),
                );
                return [];
              }
            })
            .catch(({ py, controller, path }) => {
              if (!py.killed) controller.abort();
              counter.index[newKey].current += 1;
              const current = counter.index[newKey].current;
              const total = counter.index[newKey].total;
              const setNumber = newKey;
              const data = JSON.stringify({
                fileTitle: file.title,
                index: index,
                current: current,
                total: total,
                setNumber: setNumber,
              });
              seeListeners.forEach((listener) => {
                listener.write(
                  `event: indexingFailed\n` + `data: ${data} \n\n`,
                );
              });
              console.log("Text extraction failed for : ", path);
            }),
        ),
      ),
    );
  }
  documentPromises.forEach((books) => {
    books.then((docs) => {
      docs &&
        docs.length > 0 &&
        indexedClient
          .addDocuments(docs)
          .then((task) => {
            pendingMeiliTasks.push({
              taskuid: task.taskUid,
              fileId: new Set(docs.map((doc) => doc.fileId)).values().next()
                .value,
              type: "indexing",
              index: task.indexUid,
              rankInSet: newKey,
            });
          })
          .catch((e) => {
            console.error(e);
          });
    });
  });

  res.status(200).json({ message: "indexing queued" });
}
export async function findFilesDetails(req, res) {
  const filesToFind = req.body.files;
  const promises = filesToFind.map((fileId) => findBookById(fileId, true));
  const responses = await Promise.allSettled(promises).then((promises) =>
    promises.map((pr) => pr.value),
  );
  const returns = responses.map((file) => ({
    thumbnail: uuidv5(file.title, uuidv5.URL) + ".webp",
    ...file,
  }));
  res.status(200).json(returns);
  if (!filesToFind) {
    res.status(300).json({ error: "files not included in the body" });
  }
}
export async function sseHandler(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  seeListeners.push(res);
  req.on("close", () => {
    res.end();
  });
}

export async function webHookHandler(req, res) {
  const encoding = req.headers["content-encoding"];
  let stream = req;
  if (encoding === "gzip") {
    stream = req.pipe(zlib.createGunzip());
  }
  stream
    .pipe(ndjson.parse())
    .on("data", (doneTask) => {
      const pendingTaskIndex = pendingMeiliTasks.findIndex(
        (task) =>
          task.taskuid == doneTask.uid && task.index == doneTask.indexUid,
      );
      const pendingTask = pendingMeiliTasks[pendingTaskIndex];
      if (pendingTask && pendingTask.type == "indexing") {
        counter.index[pendingTask["rankInSet"]].current += 1;
        const current = counter.index[pendingTask["rankInSet"]].current;
        const total = counter.index[pendingTask["rankInSet"]].total;
        const setNumber = pendingTask["rankInSet"];
        const data = JSON.stringify({
          fileTitle: indexingPending[pendingTask.fileId],
          index: doneTask.indexUid,
          current: current,
          total: total,
          setNumber: setNumber,
        });
        if (doneTask.status == "succeeded") {
          updateIndexes(pendingTask.fileId, doneTask.indexUid);
          seeListeners.forEach((listener) => {
            listener.write(`event: indexingSucceeded\n` + `data: ${data} \n\n`);
          });
        } else {
          seeListeners.forEach((listener) => {
            listener.write(`event: indexingFailed\n` + `data: ${data} \n\n`);
          });
        }
        if (current == total) counter.index[setNumber] = null;
      } else {
        if (
          doneTask.type == "indexDeletion" &&
          doneTask.status == "succeeded"
        ) {
          removeIndex(doneTask.indexUid);
        }
        seeListeners.forEach((listener) => {
          listener.write(
            `event: message\n` +
              `data: ${JSON.stringify({ index: doneTask.indexUid, status: doneTask.status, type: doneTask.type })}\n\n`,
          );
        });
      }
      pendingMeiliTasks.splice(pendingTaskIndex, 1);
    })
    .on("error", () => {
      res.sendStatus(400);
    })
    .on("end", () => {
      res.sendStatus(200);
    });
}

export async function getCatalog(req, res) {
  try {
    const tags = (req.query.tags || "").split(",").map((t) => t.trim());

    const isAnd = req.query.and === "true" || req.query.and === true;

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const books = await findBooksByTags(tags, isAnd);

    const entries = books.map((book) =>
      generateEntryFromFile(
        book.title,
        book.id,
        book.lastModified,
        `${baseUrl}/pdfs/${book.id}`,
        `${baseUrl}/images/${new PdfFile(book.title, book.path).thumbnail}`,
      ),
    );
    const xml = generateOpds(
      randomUUID(),
      `EasyDrawerOpds ${tags.join(",")}`,
      new Date(),
      entries,
    );
    res.status(200).type("application/atom+xml").send(xml);
  } catch (err) {
    console.error("getCatalog error:", err);
    res.status(500).json({ error: "Failed to generate catalog" });
  }
}
export async function deleteByTag(req, res) {
  if (!req.params.tag) {
    res.status(400).json({ error: "no tag specified" });
    return;
  }
  const tag = req.params.tag;
  const tbdb = await deleteBooksByTag(tag);
  const deleteFromFs = tbdb.map((tbdb) =>
    join(env.FOLDER_PATH, tbdb.relativepath, tbdb.title),
  );
  await Promise.all(deleteFromFs.map(async (tbdbPath) => await rm(tbdbPath)));
  return res.status(203).json({ status: "Bin emptied" });
}
