// בס"ד
import express from "express";
import path from "path";
import { getConfig as getEnvConfig } from "@repo/config-env";

const app = express();

const { port } = getEnvConfig();
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
