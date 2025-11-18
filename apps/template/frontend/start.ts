// בס"ד
import express from "express";
import path from "path";

const app = express();

const defaultPort = 443;
const port = process.env.PORT ?? defaultPort;
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
