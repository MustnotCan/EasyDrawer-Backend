import { spawn } from "child_process";
export default function indexFile(path, fileId) {
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
    const timeout = setInterval(() => {
      if (currentPage == lastDonePage) {
        controller.abort();
      } else {
        currentPage = lastDonePage;
      }
    }, 10000);
    py.on("error", () => {
      clearTimeout(timeout);
      reject(path);
    });
    py.stderr.on("error", (err) => console.log(err));
    py.stderr.on("data", (data) => console.log(String(data)));
    py.stdout.on("data", (data) => {
      String(data)
        .split("|||||dump|||||")
        .forEach((value, index, array) => {
          if (value != "" && index < array.length) {
            try {
              const parsedDoc = JSON.parse(value);
              lastDonePage = parsedDoc["page"];
              documents.push(parsedDoc);
            } catch {
              console.log("unable to parse this value : ", value);
            }
          }
        });
    });
    py.stdout.on("end", () => {
      resolve(documents);
    });
  });
}
