import { PrismaClient } from "@prisma/client";
import { addTag } from "./tagModel.js";

const prisma = new PrismaClient();

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
  const where = {};

  if (tagsToFilterBy.length > 0) {
    where.AND = [
      ...(where.AND || []),
      {
        tags: {
          every: {
            name: { in: tagsToFilterBy },
          },
        },
      },
      {
        tags: {
          some: {},
        },
      },
    ];
  }

  if (searchName.length > 0) {
    where.AND = [
      ...(where.AND || []),
      {
        title: {
          mode: "insensitive",
          contains: searchName,
        },
      },
    ];
  }

  const result = await prisma.book.groupBy({
    by: "title",
    where,
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
export async function getBooksFromDB(
  take,
  pageNumber,
  tagsToFilterBy,
  searchName,
) {
  try {
    if (tagsToFilterBy.length != 0) {
      if (searchName.length != 0) {
        const result = await prisma.book.findMany({
          take: take,
          skip: (pageNumber - 1) * take, //pages start at 1
          orderBy: { title: "asc" },
          distinct: "title",
          include: { tags: true },
          where: {
            AND: [
              {
                tags: {
                  every: {
                    name: { in: tagsToFilterBy },
                  },
                },
              },
              {
                tags: {
                  some: {},
                },
              },
              { title: { mode: "insensitive", contains: searchName } },
            ],
          },
        });
        return result;
      } else {
        const result = await prisma.book.findMany({
          take: take,
          skip: (pageNumber - 1) * take, //pages start at 1
          orderBy: { title: "asc" },
          distinct: "title",
          include: { tags: true },
          where: {
            AND: [
              {
                tags: {
                  every: {
                    name: { in: tagsToFilterBy },
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
        });
        return result;
      }
    } else {
      if (searchName.length != 0) {
        const result = await prisma.book.findMany({
          take: take,
          skip: (pageNumber - 1) * take, //pages start at 1
          orderBy: { title: "asc" },
          distinct: "title",
          include: { tags: true },
          where: { title: { mode: "insensitive", contains: searchName } },
        });
        return result;
      } else {
        const result = await prisma.book.findMany({
          take: take,
          skip: (pageNumber - 1) * take, //pages start at 1
          orderBy: { title: "asc" },
          distinct: "title",
          include: { tags: true },
        });
        return result;
      }
    }
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
export async function findBooksByPath(path) {
  try {
    return await prisma.book.findUnique({ where: { path: path } });
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

export async function addTagToBook(tagId, bookId) {
  try {
    await prisma.book.update({
      data: { tags: { connect: [{ id: tagId }] } },
      where: { id: bookId },
    });

    return true;
  } catch (err) {
    console.log("Error while adding tag to a book:\n", err);
    return false;
  }
}
export async function addTagsToBooks(tags, bookname) {
  try {
    const books = await prisma.book.findMany({
      where: { title: bookname },
      select: { id: true }, // Fetch only book IDs
    });

    if (books.length === 0) {
      console.log("No books found with title:", bookname);
      return false;
    }

    return await prisma.$transaction(
      books.map((book) =>
        prisma.book.update({
          where: { id: book.id },
          data: { tags: { connect: tags.map((tag) => ({ id: tag })) } },
          include: { tags: true },
        }),
      ),
    );
  } catch (err) {
    console.error("Error while adding tags to books:\n", err);
    return false;
  }
}
export async function removeTagsFromBooks(tags, bookname) {
  try {
    const books = await prisma.book.findMany({
      where: { title: bookname },
      select: { id: true }, // Fetch only book IDs
    });

    if (books.length === 0) {
      console.log("No books found with title:", bookname);
      return false;
    }

    return await prisma.$transaction(
      books.map((book) =>
        prisma.book.update({
          where: { id: book.id },
          data: { tags: { disconnect: tags.map((tag) => ({ id: tag })) } },
        }),
      ),
    );
  } catch (err) {
    console.error("Error while removing tags to books:\n", err);
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
      where: { path: path },
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
