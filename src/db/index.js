import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function saveBook(name, path, atime, tags, thumbnailPath) {
  try {
    await prisma.book
      .upsert({
        where: { path: path },
        update: {},
        create: {
          title: name,
          path: path,
          lastOpened: atime,
          tags: tags,
          thumbnailPath: thumbnailPath,
        },
      })
      .then(console.log(`${name}` + " saved successfully"));
  } catch (e) {
    console.log(name, "error happened when saving a book \n", e);
  }
}
export async function existInDb(name) {
  try {
    const result = await prisma.book.findUnique({ where: { title: name } });
    return result; // Explicitly return the result
  } catch (e) {
    console.error("Error happened when looking for a book:\n", e);
    return null; // Return null to indicate an error or no result
  }
}
export async function getFilesFromDB(size, cursor) {
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
  } catch (e) {
    console.log("Error while emptying db", e);
  }
}
//await emptyDB()

export async function removeByPath(filePath) {
  try {
    await prisma.book.delete({ where: { path: filePath } });
  } catch (error) {
    console.error("error deleting file", error);
    return null;
  }
}
export async function getRecordsNumber() {
  const count = await prisma.book.count();
  console.log(count);
  return count;
}
