// בס"ד
import * as dotenv from "dotenv";
import * as path from "path";

const rootDir = path.resolve(__dirname, "../../");

dotenv.config({
  path: [path.join(rootDir, ".public.env"), path.join(rootDir, ".secret.env")],
  override: false,
});

const defaultPort = 3000;

const usedPort = parseInt(process.env.PORT ?? defaultPort.toString());

export const getConfig = () => ({
  apiSecret: process.env.API_SECRET,
  port: usedPort,
  enviroment: process.env.NODE_ENV,
});

console.log(getConfig());
