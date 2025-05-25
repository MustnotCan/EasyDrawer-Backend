import {
  addTag,
  renameTag,
  deleteTagByName,
  getAllTags,
} from "../db/tagModel.js";
export async function getTags(req, res) {
  try {
    const tags = await getAllTags();
    const returned = [];
    for (const tag of tags) {
      returned.push({ id: tag.id, name: tag.name });
    }
    res.status(200).json(returned);
  } catch (error) {
    res(500).json({ error: error });
  }
}
export async function postTags(req, res) {
  const tag = req.body;
  try {
    const response = await addTag(tag.name);
    res.status(201).json(response);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
}
export async function patchTags(req, res) {
  const body = req.body.body;
  try {
    const response = await renameTag(body.prevTagName, body.newTagName);
    res.status(201).json(response);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
}
export async function deleteTags(req, res) {
  const tag = req.body;
  try {
    const response = await deleteTagByName(tag.name);
    res.status(200).json(response);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
}
