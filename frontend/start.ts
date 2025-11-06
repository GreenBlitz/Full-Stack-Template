// בס"ד
import express from "express";
import path from "path";

const app = express();

const PORT = process.env.PORT || 443;
const __dirname = path.dirname(__filename);

const distDirectory = path.join(__dirname, "dist");
const indexHTML = path.join(distDirectory, "index.html");

app.use(express.static(distDirectory));

app.get(/^(.*)$/, (req, res) => {
  res.sendFile(indexHTML);
});

app.listen(PORT, () => {
  console.log(`Production server running at http://localhost:${PORT}`);
});
