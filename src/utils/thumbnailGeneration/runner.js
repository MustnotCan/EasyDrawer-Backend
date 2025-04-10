import { Worker } from "node:worker_threads";

export default function runInWorker(queue) {
  console.log("something is running here");
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      "./src/utils/thumbnailGeneration/thumb_worker.js",
      {
        workerData: { queue: queue },
      },
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
