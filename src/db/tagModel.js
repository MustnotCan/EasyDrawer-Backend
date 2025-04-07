import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
const prisma = new PrismaClient();
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
  const uuid = randomUUID();
  try {
    return await prisma.tag.upsert({
      create: { name: tagName, id: uuid },
      update: {},
      where: { name: tagName },
    });
  } catch (err) {
    console.log("Error while adding tag:\n", err);
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
    return await prisma.tag.findMany();
  } catch (err) {
    console.log("Error while retriving tag:\n", err);
  }
  return await prisma.tag.findMany();
}
