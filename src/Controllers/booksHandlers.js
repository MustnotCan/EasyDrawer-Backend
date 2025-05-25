import {
  deleteBookById,
  getBooksFromDB,
  changeTagsToBooks,
  groupByPath,
  findBooksByPath,
  deleteBooksByName,
  getDistinctFilteredBooksNumber,
} from "../db/bookModel.js";
let fsDirs = null;

export async function getBooks(req, res) {
  let tagsToFilterBy = [];
  let reqTags = req.query.tags;
  if (reqTags && typeof reqTags == "string") {
    tagsToFilterBy.push(...reqTags.split(","));
  }
  const searchName = req.query.searchName || "";
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
    response.thumbnail = response.id + ".webp";
    res.status(200).json(response);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
}
export async function getBooksMultiTagger(req, res) {
  if (fsDirs == null) {
    fsDirs = await groupByPath();
  }
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
        thumbnail: res.id + ".webp",
        tags: res.tags,
        path: res.path,
        lastOpened: res.lastOpened,
      };
    });
    res
      .status(200)
      .json({ dirs: [...directories], files: [...pdfsWithDetails] });
  } catch (e) {
    if (e.code == "ENOENT") {
      console.log("Path do not exist");
      res.status(401).json({});
    }
    res.status(500).json({ error: e });
  }
}
export async function deleteBooks(req, res) {
  const id = req.params.id;

  try {
    const response = await deleteBookById(id);
    res.status(201).json(response);
  } catch (e) {
    console.log("error while deleting a book by id: ", e);
    res.status(400);
  }
}
export async function deleteBooksBulkDelete(req, res) {
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
}
