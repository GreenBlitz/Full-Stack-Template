// בס"ד
import * as dotenv from "dotenv";
import * as path from "path";

// Locate the root directory (adjust path based on your exact structure if needed)
const rootDir = path.resolve(__dirname, "../../");

console.log(rootDir);
dotenv.config({
  path: [path.join(rootDir, ".public.env"), path.join(rootDir, ".secret.env")],
});

const defaultPort = 3000;

const usedPort = parseInt(process.env.PORT ?? defaultPort.toString());

// You can also export a typed configuration object here
export const config = {
  apiSecret: process.env.API_SECRET,
  port: usedPort,
};
