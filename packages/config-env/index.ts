// בס"ד
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const filename = fileURLToPath(import.meta.url);
const packageDirname = path.dirname(filename);

const rootDir = path.resolve(packageDirname, "../../");

dotenv.config({
  path: [
    path.join(rootDir, ".public.env"),
    path.join(rootDir, ".secret.env"),
  ] as unknown as string,
  //the type definitions for the config are just wrong... this should be a `string | string[] | undefined`
});

const defaultPort = 3000;

const usedPort = parseInt(process.env.PORT ?? defaultPort.toString());

export const getConfig = () => ({
  apiSecret: process.env.API_SECRET,
  port: usedPort,
  enviroment: process.env.NODE_ENV,
});

console.log(getConfig());
