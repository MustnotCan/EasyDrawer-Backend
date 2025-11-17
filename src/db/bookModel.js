import { addTag } from "./tagModel.js";
import prisma from "./prismaInit.js";
import { join } from "path";
import { client } from "../Controllers/booksHandlers.js";
export async function deleteBookByPath(filePath) {
  try {
    return await prisma.book.delete({ where: { path: filePath } });
  } catch (error) {
    console.error("error deleting file", error);
    return null;
  }
}
export async function getDistinctBooksNumber() {
  const res = await prisma.$queryRaw`
  SELECT COUNT(DISTINCT "title")::int AS count FROM "Book";
`;
  return res;
}
const andOr = (tags, isAnd) => {
  const and = [];
  if (isAnd) {
    for (const tag of tags) {
      and.push({
        tags: {
          some: {
            name: { in: [tag] },
          },
        },
      });
    }
  } else {
    and.push({ tags: { some: { name: { in: tags } } } });
  }
  return and;
};
export async function getDistinctFilteredBooksNumber(
  tagsToFilterBy,
  searchName,
  isAnd,
) {
  let and = [];
  if (
    tagsToFilterBy.length > 0 &&
    !tagsToFilterBy.map((tag) => tag.toLowerCase()).includes("unclassified")
  ) {
    and = andOr(tagsToFilterBy, isAnd);
  }
  if (tagsToFilterBy.map((tag) => tag.toLowerCase()).includes("unclassified")) {
    and.push({ tags: { every: { name: { in: [] } } } });
  }
  if (searchName.length > 0) {
    and.push({ title: { mode: "insensitive", contains: searchName } });
  }
  const result = await prisma.book.count({
    where: { AND: and },
  });
  return result;
}
export async function getBookByName(name) {
  try {
    const result = await prisma.book.findMany({ where: { title: name } });
    return result;
  } catch (e) {
    console.error("Error happened when looking for a book:\n", e);
    return null;
  }
}
export async function getAllBooks() {
  try {
    const books = await prisma.book.findMany({
      select: { id: true, path: true, title: true, lastModified: true },
    });
    return books;
  } catch (e) {
    console.log(e);
  }
}
export async function getBooksFromDB(
  take,
  pageNumber,
  tagsToFilterBy,
  searchName,
  isAnd,
  orderByCriteria,
  orderByDirection,
) {
  let and = [];
  if (
    tagsToFilterBy.length > 0 &&
    !tagsToFilterBy.map((tag) => tag.toLowerCase()).includes("unclassified")
  ) {
    and = andOr(tagsToFilterBy, isAnd);
  }
  if (tagsToFilterBy.map((tag) => tag.toLowerCase()).includes("unclassified")) {
    and.push({ tags: { every: { name: { in: [] } } } });
  }
  if (searchName.length > 0) {
    and.push({ title: { mode: "insensitive", contains: searchName } });
  }
  try {
    const oB = { [orderByCriteria]: orderByDirection };
    const result = await prisma.book.findMany({
      take: take,
      skip: (pageNumber - 1) * take, //pages start at 1
      orderBy: oB,
      include: { tags: true },
      where: { AND: and },
    });
    return result;
  } catch (err) {
    console.log("-->Unable to get files from db\n", err);
    return null;
  }
}
export async function findBooksByName(bookTitle) {
  try {
    return await prisma.book.findMany({
      where: { title: { contains: bookTitle } },
    });
  } catch (err) {
    console.log("Error fetching books by title:\n", err);
  }
}
export async function findBooksByPathAndTitle(title, path) {
  try {
    return await prisma.book.findFirst({
      where: { path: path, title: title },
      select: {
        id: true,
        path: true,
        title: true,
        tags: true,
        addedDate: true,
      },
    });
  } catch (err) {
    console.log("Error fetching books by path & title:\n", err);
  }
}
export async function findBooksByPath(path) {
  try {
    return await prisma.book.findMany({
      where: { path: path },
      include: { tags: true },
    });
  } catch (err) {
    console.log("Error fetching books by path:\n", err);
  }
}
export async function findBooksByTags(
  tagsList,
  isAnd = false,
  distinctByTitle = false,
) {
  let and = [];
  and = andOr(tagsList, isAnd);

  try {
    return await prisma.book.findMany({
      where: {
        AND: and,
      },
      distinct: distinctByTitle ? "title" : "id",
    });
  } catch (err) {
    console.log("Error fetching books by tags:\n", err);
  }
}
export async function findBookById(id, withTags = false) {
  return await prisma.book.findUnique({
    where: { id: id },
    include: { tags: withTags },
  });
}
export async function changeTagsToBooks(addedTags, removedTags, path) {
  try {
    const lastIndexOfSlash = path.lastIndexOf("/");
    const relativePath = path.slice(0, lastIndexOfSlash);
    const title = path.slice(lastIndexOfSlash + 1);
    const books = await prisma.book.findMany({
      where: { title: title, path: relativePath },
      select: { id: true }, // Fetch only book IDs
    });

    if (books.length === 0) {
      console.log("No books found with title:", path);
      return false;
    }
    const modifiedBooks = await prisma.$transaction(
      books.map((book) =>
        prisma.book.update({
          where: { id: book.id },
          data: {
            tags: {
              connect: addedTags.map((tag) => ({ id: tag.id })),
              disconnect: removedTags.map((tag) => ({ id: tag.id })),
            },
          },
          select: { title: true, tags: true, path: true },
        }),
      ),
    );
    return modifiedBooks[0];
  } catch (err) {
    console.error("Error while adding tags to books:\n", err);
    return false;
  }
}
export async function changeTagsToMultipleBooks(
  addedTags,
  removedTags,
  booksPaths,
) {
  return await Promise.all(
    booksPaths.map((path) => changeTagsToBooks(addedTags, removedTags, path)),
  );
}
export async function removeTagFromBook(tagId, bookId) {
  try {
    await prisma.book.update({
      data: { tags: { disconnect: [{ id: tagId }] } },
      where: { id: bookId },
    });
    return true;
  } catch (err) {
    if (
      err.meta.cause ==
      "No parent record was found for a nested disconnect on relation 'bookTotag'."
    ) {
      return true;
    }
    console.log("Error while adding tag to a book:\n", err);
    return false;
  }
}
export async function saveBook(
  uuid,
  name,
  path,
  lastAccess,
  lastModified,
  addedDate,
  tags,
) {
  const bookTags = tags.map((ele) => ele.split(",")).flat();
  try {
    for (const tag of bookTags) {
      await addTag(tag);
    }
    return await prisma.book.upsert({
      where: { id: uuid },
      update: {},
      create: {
        id: uuid,
        title: name,
        path: path,
        lastAccess: lastAccess,
        lastModified: lastModified,
        addedDate: addedDate,
        tags: { connect: bookTags.map((tag) => ({ name: tag })) },
      },
    });
  } catch (e) {
    console.log(name, "error happened when saving a book \n", e);
  }
}
export async function deleteBookById(bookId) {
  try {
    const deletedBook = await prisma.book.delete({ where: { id: bookId } });
    deletedBook.indexes.forEach((index) =>
      client
        .index(index)
        .deleteDocuments({ filter: { fileId: deletedBook.id } }),
    );
  } catch (e) {
    console.log("error happened removing a book by id \n", e);
  }
}
export async function deleteBooksByName(bookname) {
  try {
    const toBeDeletedBook = await prisma.book.findFirst({
      where: { title: bookname },
    });
    await prisma.book.deleteMany({
      where: { title: bookname },
    });
    toBeDeletedBook.indexes.forEach((index) =>
      client
        .index(index)
        .deleteDocuments({ filter: { fileId: toBeDeletedBook.id } }),
    );
  } catch (e) {
    console.log("error happened removing books by name \n", e);
  }
}
export async function deleteBooksByTag(tag) {
  try {
    const toBeDeletedBooks = await prisma.book.findMany({
      where: { tags: { some: { name: { equals: tag } } } },
    });
    await prisma.book.deleteMany({
      where: { id: { in: toBeDeletedBooks.map((tbdb) => tbdb.id) } },
    });
    toBeDeletedBooks.forEach((tbdb) =>
      tbdb.indexes.forEach((index) =>
        client.index(index).deleteDocuments({ filter: { fileId: tbdb.id } }),
      ),
    );
    return toBeDeletedBooks.map((tbdb) => ({
      title: tbdb.title,
      relativepath: tbdb.path,
    }));
  } catch (e) {
    console.log("error happened removing books by name \n", e);
  }
}
export async function deleteBooksByPathandName(relativePath, name) {
  try {
    const toBeDeletedBook = await prisma.book.findFirst({
      where: { path: relativePath, title: name },
    });
    const deletedBook = await prisma.book.delete({
      where: { id: toBeDeletedBook.id },
    });
    deletedBook.indexes.forEach((index) =>
      client
        .index(index)
        .deleteDocuments({ filter: `fileId = ${deletedBook.id}` }),
    );
  } catch (e) {
    console.log("error happened removing books by PathandName \n", e);
  }
}

export async function groupByPath(paramsPath) {
  try {
    const results = await prisma.book.findMany({
      distinct: "path",
      select: { path: true },
      where: { path: { contains: paramsPath } },
    });
    const paths = results.map((res) => res.path);
    const pathSet = new Set(paths);
    pathSet.add("/");
    for (const path of paths) {
      const segments = path.split("/");
      let currentPath = "";
      for (const segment of segments) {
        if (segment) {
          currentPath += `/${segment}`;
          pathSet.add(currentPath);
        }
      }
    }
    const pathDepths = Array.from(pathSet).map((path) => ({
      path,
      depth: path === "/" ? 1 : path.split("/").length,
    }));
    const pathMap = new Map();
    for (const { path, depth } of pathDepths) {
      const parentPaths = pathDepths.filter(
        (p) => p.path.startsWith(path) && p.depth === depth + 1,
      );
      pathMap.set(
        path,
        parentPaths.map((sub) => sub.path.replace(path, "")),
      );
    }
    return Array.from(pathMap.entries()).map(([path, subpaths]) => ({
      path,
      subpaths,
    }));
  } catch (error) {
    console.error("Error occurred while fetching the folders:", error);
  }
}
export async function getFilesFromSelectedAndUnselected(
  selectedFolders,
  unselectedFolders,
  selectedFiles,
  unselectedFiles,
  withTags,
) {
  try {
    //get all files calculate lsp-lup and select the files if >0
    const selectedFilesPromises = selectedFolders.map((folder) => {
      return prisma.book.findMany({
        where: { path: { contains: folder } },
        select: { path: true, title: true, tags: withTags },
      });
    });
    const unselectedFilesPromises = unselectedFiles.map((folder) => {
      return prisma.book.findMany({
        where: { path: { contains: folder } },
        select: { path: true, title: true, tags: withTags },
      });
    });
    const foundSelectedFiles = (
      await Promise.all(selectedFilesPromises)
    ).flatMap((array) => {
      return array.map((element) => {
        return {
          fullpath: join(element.path, element.title),
          tags: element.tags,
        };
      });
    });
    const foundUnSelectedFiles = (
      await Promise.all(unselectedFilesPromises)
    ).flatMap((array) => {
      return array.map((element) => {
        return {
          fullpath: join(element.path, element.title),
          tags: element.tags,
        };
      });
    });
    const selectedFilesDetailsPromises = selectedFiles.map((file) => {
      const title = file.slice(file.lastIndexOf("/") + 1);
      const path = file.slice(0, file.lastIndexOf("/")) || "/";
      return findBooksByPathAndTitle(title, path);
    });
    const selectedFilesDetails = await Promise.all(
      selectedFilesDetailsPromises,
    );
    selectedFilesDetails.forEach((element) => {
      foundSelectedFiles.push(
        withTags
          ? {
              fullpath: join(element.path, element.title),
              tags: element.tags,
            }
          : {
              fullpath: join(element.path, element.title),
            },
      );
    });
    const unSelectedFilesDetailsPromises = unselectedFiles.map((file) => {
      const title = file.slice(file.lastIndexOf("/") + 1);
      const path = file.slice(0, file.lastIndexOf("/")) || "/";
      return findBooksByPathAndTitle(title, path);
    });
    const unSelectedFilesDetails = await Promise.all(
      unSelectedFilesDetailsPromises,
    );
    unSelectedFilesDetails.forEach((element) => {
      foundUnSelectedFiles.push(
        withTags
          ? {
              fullpath: join(element.path, element.title),
              tags: element.tags,
            }
          : {
              fullpath: join(element.path, element.title),
            },
      );
    });
    const filteredFiles = foundSelectedFiles.filter((element) => {
      const possibleParents = element.fullpath
        .split("/")
        .map((v, i, a) => {
          if (i == 0) {
            return "/";
          } else {
            return [...a.slice(0, i), v].join("/");
          }
        })
        .filter((path) => !path.endsWith(".pdf"));
      if (selectedFiles.includes(element.fullpath)) {
        return true;
      } else if (unselectedFiles.includes(element.fullpath)) {
        return false;
      } else {
        const lsp = selectedFolders
          .filter((folder) => possibleParents.includes(folder))
          .sort();
        const lup = unselectedFolders
          .filter((folder) => possibleParents.includes(folder))
          .sort();
        const lsplength = lsp.length > 0 ? lsp.at(0).length : 0;
        const luplength = lup.length > 0 ? lup.at(0).length : 0;

        if (lsplength - luplength > 0) {
          return true;
        } else {
          return false;
        }
      }
    });
    return filteredFiles;
  } catch (e) {
    console.log("Error happened when trying to select files", e);
  }
}
export async function updateBooksPaths(bookTitle, bookPath, newPath) {
  try {
    const book = await findBooksByPathAndTitle(bookTitle, bookPath);
    return await prisma.book.update({
      data: { path: newPath },
      where: { id: book.id },
    });
  } catch (e) {
    console.log(e);
  }
}
export async function getIndexes(bookId) {
  try {
    return (await prisma.book.findUnique({ where: { id: bookId } })).indexes;
  } catch (e) {
    console.error(e);
  }
}
export async function updateIndexes(bookId, index) {
  try {
    return await prisma.book.update({
      where: { id: bookId },
      data: { indexes: { push: index } },
    });
  } catch (e) {
    console.error(e);
  }
}
export async function removeIndex(index) {
  try {
    const havingIndex = await prisma.book.findMany({
      where: { indexes: { has: index } },
      select: { id: true, indexes: true },
    });
    const updatingPromises = havingIndex.map(
      async (entry) =>
        await prisma.book.update({
          where: { id: entry.id },
          data: {
            indexes: { set: entry.indexes.filter((ind) => ind != index) },
          },
        }),
    );
    return await Promise.all(updatingPromises);
  } catch (e) {
    console.error(e);
  }
}
