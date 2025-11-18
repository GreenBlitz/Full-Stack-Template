// בס"ד
import express from "express";
import path from "path";
import { config as envConfig } from "@repo/config-env";

const app = express();

const { port } = envConfig;
const dirname = path.dirname(__filename);

const distDirectory = path.join(dirname, "dist");
const indexHTML = path.join(distDirectory, "index.html");

app.use(express.static(distDirectory));

app.get(/^(.*)$/, (req, res) => {
  res.sendFile(indexHTML);
});

app.listen(port, () => {
  console.log(`Production server running at http://localhost:${port}`);
});
