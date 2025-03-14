import { Worker } from "worker_threads";

export default function runInWorker(name, path) {
  return new Promise((resolve, reject) => {
    //console.log("working on: ", name);
    const worker = new Worker(
      "/home/saif/Coding/Projects/nodejs projects/docManBackend/src/utils/thumbnailGeneration/thumb_worker.js",
      { workerData: { name, path } },
    );
    //worker.on("message", (message) => console.log(message));
    worker.on("error", (err) => reject(err));
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
      else {
        worker.terminate(); // Proper cleanup
        resolve();
      }
    });
  });
}
