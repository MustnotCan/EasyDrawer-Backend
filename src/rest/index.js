import express from "express";
import { getFilesFromDB } from "../db/index.js";
import { configDotenv } from "dotenv";
import { env } from "node:process";
configDotenv();
const app = express();

app.use("/images", express.static(env.FOLDER_PATH));
app.use("/pdfs", express.static(env.THUMBNAIL_FOLDER));

app.get("/", async (req, res) => {
  try {
    const size = Number.parseInt(req.query.size, 10);
    var curs = Number.parseInt(req.query.cursor, 10);
    if (isNaN(size) || size <= 0) {
      return res.status(400).send("Invalid size parameter");
    }
    var result = await getFilesFromDB(size, curs);
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3000, () => console.log("Server started on http://localhost:3000"));
