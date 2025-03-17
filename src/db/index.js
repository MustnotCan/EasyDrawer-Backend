import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function saveBook(name, path, atime, tags, thumbnailPath) {
  const bookTags = tags.map((ele) => ele.split(",")).flat();
  try {
    for (const tag of bookTags) {
      await addTag(tag);
    }
    return await prisma.book.upsert({
      where: { path: path },
      update: {},
      create: {
        title: name,
        path: path,
        lastOpened: atime,
        tags: { connect: bookTags.map((tag) => ({ name: tag })) },
        thumbnailPath: thumbnailPath,
      },
    });
  } catch (e) {
    console.log(name, "error happened when saving a book \n", e);
  }
}
export async function bookInDb(name) {
  try {
    const result = await prisma.book.findMany({ where: { title: name } });
    return result;
  } catch (e) {
    console.error("Error happened when looking for a book:\n", e);
    return null;
  }
}
export async function getBooksFromDB(size, cursor) {
  try {
    const result = await prisma.book.findMany({
      take: size,
      cursor: cursor ? { id: cursor } : undefined,
      skip: 1,
      orderBy: { title: "asc" },
      distinct: "title",
    });
    return result;
  } catch (err) {
    console.log("-->Unable to get files from db\n", err);
    return null;
  }
}

export async function emptyDB() {
  try {
    await prisma.book.deleteMany();
    await prisma.tag.deleteMany();
  } catch (e) {
    console.log("Error while emptying db", e);
  }
}

export async function deleteBookByPath(filePath) {
  try {
    return await prisma.book.delete({ where: { path: filePath } });
  } catch (error) {
    console.error("error deleting file", error);
    return null;
  }
}
export async function getRecordsNumber() {
  const count = await prisma.book.count();
  return count;
}
export async function addTag(tagName) {
  try {
    await prisma.tag.upsert({
      create: { name: tagName },
      update: {},
      where: { name: tagName },
    });
  } catch (err) {
    console.log("Error while adding tag:\n", err);
  }
}
export async function findBooksByName(bookTitle) {
  try {
    return await prisma.book.findMany({ where: { title: bookTitle } });
  } catch (err) {
    console.log("Error fetching books by title:\n", err);
  }
}
export async function findTagsByName(tagName) {
  try {
    return await prisma.tag.findMany({ where: { name: tagName } });
  } catch (err) {
    console.log("Error fetching books by name:\n", err);
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
export async function deleteTagById(tagId) {
  try {
    return await prisma.tag.delete({ where: { id: tagId } });
  } catch (err) {
    if (err.meta.cause == "Record to delete does not exist.") {
      return true;
    }
    console.log("Error while adding tag to a book:\n", err);
    return null;
  }
}
