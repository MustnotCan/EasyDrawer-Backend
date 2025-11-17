import { randomUUID } from "node:crypto";
import prisma from "./prismaInit.js";

export async function findTagsByName(tagsName) {
  try {
    return await prisma.tag.findMany({
      where: { name: { in: tagsName } },
    });
  } catch (err) {
    console.log("Error fetching books by name:\n", err);
  }
}
export async function deleteTagById(tagId) {
  try {
    return await prisma.tag.delete({ where: { id: tagId } });
  } catch (err) {
    if (err.meta.cause == "Record to delete does not exist.") {
      return { deleted: true };
    }
    console.log("Error while adding tag to a book:\n", err);
    return null;
  }
}
export async function addTag(tagName) {
  try {
    const found = await prisma.tag.findUnique({ where: { name: tagName } });
    if (found == null) {
      return await prisma.tag.upsert({
        create: { name: tagName, id: randomUUID() },
        update: { undefined },
        where: { name: tagName },
      });
    }
    return found;
  } catch (err) {
    console.log("Error while adding tag:\n", err);
  }
}
export async function renameTag(preTagName, newTagName) {
  try {
    return await prisma.tag.update({
      data: { name: newTagName },
      where: { name: preTagName },
    });
  } catch (err) {
    console.log("Error while renaming tag:\n", err);
  }
}
export async function deleteTagByName(tagName) {
  try {
    return await prisma.tag.delete({
      where: { name: tagName },
    });
  } catch (err) {
    console.log("Error while deleting tag:\n", err);
  }
}
export async function getAllTags() {
  try {
    let toAdd = [];
    let existingTagsName = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { name: true, id: true, book: true },
    });

    const loweredExistingTags = existingTagsName.map((tag) =>
      tag.name.toLowerCase(),
    );
    const defaultTags = ["favorite", "bin", "unclassified"];

    defaultTags.forEach((tag) => {
      if (!loweredExistingTags.includes(tag)) {
        toAdd.push({
          id: randomUUID(),
          name: tag,
        });
      }
    });
    if (toAdd.length != 0) {
      existingTagsName = existingTagsName.concat(
        await prisma.tag.createManyAndReturn({
          data: toAdd,
        }),
      );
    }
    existingTagsName = existingTagsName.map((tag) => ({
      name: tag.name,
      id: tag.id,
      booksCount: tag.book ? tag.book.length : 0,
    }));

    return existingTagsName;
  } catch (err) {
    console.log("Error while retriving tag:\n", err);
  }
}
