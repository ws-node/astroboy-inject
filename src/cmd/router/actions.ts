import path from "path";
import get from "lodash/get";
import { IRouterCmdOptions } from "./options";
import { exec } from "child_process";
import { loadConfig } from "../utils/loadConfig";
import chalk from "chalk";

export = function(_, command: IRouterCmdOptions) {
  if (_ !== "router") return;
  console.log(chalk.green("========= [ASTROBOY.TS] <==> ROUTER ========"));
  const fileName = command.config || "atc.config.js";
  console.log(`${chalk.white("尝试加载配置文件 : ")}${chalk.yellow(fileName)}`);
  let config: any;
  const defaultConfigs = {
    enabled: true,
    always: false,
    approot: "",
    filetype: "js",
    details: false,
    tsconfig: undefined
  };
  try {
    const req = loadConfig(process.cwd(), fileName);
    config = {
      ...defaultConfigs,
      ...get(req, "routers", {}),
      tsconfig: req.tsconfig || config.tsconfig
    };
  } catch (_) {
    config = defaultConfigs;
  }

  if (command.enabled) config.enabled = String(command.enabled) === "true";
  if (command.always) config.always = String(command.always) === "true";
  if (command.details) config.details = String(command.details) === "true";
  if (command.approot) config.approot = command.approot;
  if (command.filetype) config.filetype = command.filetype;
  if (command.tsconfig) config.tsconfig = command.tsconfig;
  try {
    const tsnode = require.resolve("ts-node");
    console.log(chalk.cyan("正在构建路由，请稍候...\n"));
    const astroboy_ts = require.resolve("astroboy.ts");
    const registerFile = astroboy_ts.replace("/index.js", "/cmd/register");
    const initFile = astroboy_ts.replace("/index.js", "/cmd/init");
    console.log(chalk.yellow("开始执行路由初始化逻辑："));
    console.log(`script ==> ${chalk.grey(initFile)}`);
    exec(
      `node -r ${registerFile} ${initFile}`,
      {
        env: {
          CTOR_PATH: path.resolve(process.cwd(), "app/controllers"),
          ROUTER_PATH: path.resolve(process.cwd(), "app/routers"),
          ASTT_ENABLED:
            config.enabled === undefined
              ? "true"
              : String(!!config.enabled === true),
          ASTT_ALWAYS: String(!!config.always),
          APP_ROOT: config.approot || "",
          FILE_TYPE: config.filetype || "js",
          SHOW_ROUTERS: String(!!config.details),
          __TSCONFIG: config.tsconfig || "_"
        }
      },
      (error, stdout, stderr) => {
        if (error) {
          console.log(chalk.yellow("初始化routers失败"));
          console.log(chalk.red(<any>error));
          console.log("--------------------");
          return;
        }
        if (stderr) {
          console.log(chalk.yellow("初始化routers失败"));
          console.log(chalk.red(stderr));
          console.log("--------------------");
          return;
        }
        try {
          const count = showRoutes(JSON.parse(stdout || "{}") || {});
          console.log(
            chalk.green(`路由初始化完成${chalk.white(`[${count}]`)}`)
          );
        } catch (_) {
          console.log(chalk.yellow("初始化routers失败"));
          console.log(chalk.red(_));
          console.log("--------------------");
        }
      }
    );
  } catch (e) {
    console.log(chalk.yellow("初始化routers失败"));
    if (((<Error>e).message || "").includes("ts-node")) {
      console.log(chalk.red("请安装ts-node"));
      return;
    }
    throw e;
  }
};

function showRoutes(obj: any, preK?: string) {
  let count = 0;
  Object.keys(obj || {}).forEach(k => {
    if (typeof obj[k] === "string") {
      console.log(chalk.blue(!preK ? `--> ${k}` : `--> ${preK}/${k}`));
      count += 1;
    } else {
      count += showRoutes(obj[k], !preK ? k : `${preK}/${k}`);
    }
  });
  return count;
}
