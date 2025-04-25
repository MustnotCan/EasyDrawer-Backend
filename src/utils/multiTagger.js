import path from "path";
import { readdirSync } from "fs";
export function filesAndDirs(dir) {
  const files = readdirSync(dir, { withFileTypes: true });
  const AllParentPaths = new Set(files.map((file) => file.parentPath));
  console.log(AllParentPaths);
  const mapper = new Map();
  mapper.set(
    "directories",
    new Set(
      files
        .filter((file) => file.isDirectory() == true)
        .map((file) => file.name),
    ),
  );
  mapper.set(
    "pdfs",
    new Set(
      files
        .filter((file) => path.parse(file.name).ext == ".pdf")
        .map((file) => file.name),
    ),
  );

  return mapper;
}
