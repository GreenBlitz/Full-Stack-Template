// בס"ד
import express from "express";
import path from "path";

const app = express();

const defaultPort = 80;
const securePort = 443;
const port = parseInt(process.env.FRONTEND_PORT ?? defaultPort.toString());
const protocol = port === securePort ? "https" : "http";

const dirname = path.dirname(__filename);
const distDirectory = path.join(dirname, "dist");
const indexHTML = path.join(distDirectory, "index.html");

app.use(express.static(distDirectory));

app.get(/^(.*)$/, (req, res) => {
  res.sendFile(indexHTML);
});

app.listen(port, () => {
  console.log(`Production server running at ${protocol}://localhost:${port}`);
});
