import { addTag } from "./tagModel.js";
import prisma from "./prismaInit.js";
export async function deleteBookByPath(filePath) {
  try {
    return await prisma.book.delete({ where: { path: filePath } });
  } catch (error) {
    console.error("error deleting file", error);
    return null;
  }
}

export async function getDistinctBooksNumber() {
  const res = (await prisma.book.groupBy({ by: "title" })).length;
  return res;
}
export async function getDistinctFilteredBooksNumber(
  tagsToFilterBy,
  searchName,
) {
  const and = [];
  if (
    tagsToFilterBy.length > 0 &&
    !tagsToFilterBy.map((tag) => tag.toLowerCase()).includes("unclassified")
  ) {
    for (const tag of tagsToFilterBy) {
      and.push({
        tags: {
          some: {
            name: { in: [tag] },
          },
        },
      });
    }
  }

  if (tagsToFilterBy.map((tag) => tag.toLowerCase()).includes("unclassified")) {
    and.push({ tags: { every: { name: { in: [] } } } });
  }
  if (searchName.length > 0) {
    and.push({ title: { mode: "insensitive", contains: searchName } });
  }
  const result = await prisma.book.groupBy({
    by: "title",
    where: { AND: and },
  });
  return result.length;
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
      select: { id: true, path: true },
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
) {
  const and = [];
  if (
    tagsToFilterBy.length > 0 &&
    !tagsToFilterBy.map((tag) => tag.toLowerCase()).includes("unclassified")
  ) {
    for (const tag of tagsToFilterBy) {
      and.push({
        tags: {
          some: {
            name: { in: [tag] },
          },
        },
      });
    }
  }

  if (tagsToFilterBy.map((tag) => tag.toLowerCase()).includes("unclassified")) {
    and.push({ tags: { every: { name: { in: [] } } } });
  }
  if (searchName.length > 0) {
    and.push({ title: { mode: "insensitive", contains: searchName } });
  }
  try {
    const result = await prisma.book.findMany({
      take: take,
      skip: (pageNumber - 1) * take, //pages start at 1
      orderBy: { title: "asc" },
      distinct: "title",
      include: { tags: true },
      where: {
        AND: and,
      },
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
      include: { tags: true },
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
export async function findBooksByTags(tagsList) {
  try {
    return await prisma.book.findMany({
      where: {
        AND: [
          {
            tags: {
              every: {
                name: { in: tagsList },
              },
            },
          },
          {
            tags: {
              some: {},
            },
          },
        ],
      },
      distinct: "path",
    });
  } catch (err) {
    console.log("Error fetching books by tags:\n", err);
  }
}

export async function changeTagsToBooks(addedTags, removedTags, bookname) {
  try {
    const books = await prisma.book.findMany({
      where: { title: bookname },
      select: { id: true }, // Fetch only book IDs
    });

    if (books.length === 0) {
      console.log("No books found with title:", bookname);
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
          include: { tags: true },
        }),
      ),
    );
    return modifiedBooks[0];
  } catch (err) {
    console.error("Error while adding tags to books:\n", err);
    return false;
  }
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
export async function saveBook(uuid, name, path, atime, tags) {
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
        lastOpened: atime,
        tags: { connect: bookTags.map((tag) => ({ name: tag })) },
      },
    });
  } catch (e) {
    console.log(name, "error happened when saving a book \n", e);
  }
}

export async function deleteBookById(bookId) {
  try {
    await prisma.book.delete({ where: { id: bookId } });
  } catch (e) {
    console.log("error happened removing a book by id \n", e);
  }
}
export async function deleteBooksByName(bookname) {
  try {
    await prisma.book.deleteMany({ where: { title: bookname } });
  } catch (e) {
    console.log("error happened removing books by name \n", e);
  }
}

export async function groupByPath() {
  try {
    const results = await prisma.book.findMany({
      distinct: "path",
      select: { path: true },
    });

    const paths = results.map((res) => res.path);

    // Use a Set to store all unique paths
    const pathSet = new Set(paths);

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

    // Convert the set into an array and compute depths
    const pathDepths = Array.from(pathSet).map((path) => ({
      path,
      depth: path === "/" ? 1 : path.split("/").length,
    }));

    // Group paths by parent
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

    // Return the final structure
    return Array.from(pathMap.entries()).map(([path, subpaths]) => ({
      path,
      subpaths,
    }));
  } catch (error) {
    console.error("Error occurred while fetching the folders:", error);
  }
}
