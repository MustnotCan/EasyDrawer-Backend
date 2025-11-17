import { spawn } from "child_process";
import { createInterface } from "readline/promises";

export default function extractText(path, fileId) {
  const controller = new AbortController();
  return new Promise((resolve, reject) => {
    let lastDonePage = 0;
    let currentPage = 0;
    const documents = [];
    const py = spawn(
      "python3",
      ["src/PythonCode/PdfTextContentExtraction.py", path, fileId],
      {
        signal: controller.signal,
        killSignal: "SIGKILL",
      },
    );
    const rl = createInterface(py.stdout);
    const timeout = setInterval(() => {
      if (currentPage === lastDonePage) {
        controller.abort();
      } else {
        currentPage = lastDonePage;
      }
    }, 10000);
    rl.on("line", (line) => {
      try {
        const obj = JSON.parse(line);
        lastDonePage = obj.page;
        documents.push(obj);
      } catch {
        console.log("Bad NDJSON line:", line);
      }
    });
    py.on("error", (err) => {
      reject(err);
    });
    py.stdout.on("end", () => {
      clearInterval(timeout);
      resolve(documents);
    });
  });
}
