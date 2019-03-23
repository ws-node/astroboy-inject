import path from "path";
import fs from "fs";
import chalk from "chalk";
import ts from "typescript";
import childProcess, { ChildProcess, exec, fork, spawn } from "child_process";
import * as chokidar from "chokidar";
import { CommandPlugin, InnerCmdConfig } from "../base";
import { CancellationToken } from "../utils/cancellation-token";
import { NormalizedMessage } from "../utils/normalized-msg";
import { loadConfig } from "../utils/load-config";
import { runConfigCompile } from "./config";
import { runMiddlewareCompile } from "./middleware";

const STATR_BASH = "🎩 - START APP BASH";
const WATCHING = "👀 - WATCHING";
const IGNORED = "🐒 - IGNORED";
const ENVS = "🏠 - ENVS";
const BOOTSTRAP = "🚚 - APP STARTING";
const TYPE_CHECK = "👮 - TYPE CHECKING";
const TYPE_GOOD = "👌 - TS CHECK GOOD";
const TYPE_OVER = "🏁 - TS CHECK OVER";

export interface IDevCmdOptions {
  config: string;
  debug: string | boolean;
  env: string;
  port: number | string;
  mock: string | boolean;
  tsconfig: string;
  inspect: boolean;
  compile: boolean;
}

interface ForkCmdOptions {
  command: string;
  args: string[];
  env: any;
  check: boolean;
  cwd: string;
  token: CancellationToken;
  checkProcess: ChildProcess;
  mainProcess: ChildProcess;
  changes: string[];
}

export const DevPlugin: CommandPlugin = {
  name: "dev",
  description: "本地开发，开启后端服务",
  options: [
    ["-C, --config [atcConfig]", "使用自定义的atc.config.js配置文件"],
    ["-D, --debug [debugName]", "开启 debug 模式"],
    ["-E, --env [NODE_ENV]", "设置 NODE_ENV 环境变量，默认 development"],
    ["-P, --port [NODE_PORT]", "设置 NODE_PORT 环境变量，默认 8201"],
    [
      "-M, --mock [proxyUrl]",
      "开启 mock 模式，默认 proxy 地址为 http://127.0.0.1:8001"
    ],
    ["-T, --tsconfig [config]", "使用自定义的ts编译配置文件"],
    ["-I, --inspect [inspect]", "启用inspector，开启编辑器断点调试"],
    ["--compile", "启用编译"]
  ],
  help: () => {
    console.log("");
    console.log("  Examples:");
    console.log("");
    console.log("    $ atc dev");
    console.log("    $ atc dev --debug");
    console.log("    $ atc dev --debug koa:application");
    console.log("    $ atc dev --debug --mock");
    console.log("    $ atc dev --mock http://127.0.0.1:8001");
    console.log("    $ atc dev --mock");
    console.log("    $ atc dev --env pre");
    console.log("    $ atc dev --port 8201");
    console.log("    $ atc dev --env development --port 8201");
    console.log("    $ atc dev --tsconfig app/tsconfig.json");
    console.log("    $ atc dev --inspect");
    console.log();
  },
  async action(_, command: IDevCmdOptions) {
    if (_ !== "dev") return;
    console.log(chalk.green("========= [ASTROBOY.TS] <==> DEVTOOL ========\n"));
    const projectRoot = process.cwd();
    if (!fs.existsSync(`${projectRoot}/app/app.ts`)) {
      console.log(chalk.yellow("PROJECT INIT FAILED\n"));
      console.log(chalk.red(`NO FILE [${projectRoot}/app/app.ts] EXIST`));
      return;
    }
    const fileName = command.config || "atc.config.js";
    console.log(
      `${chalk.white("🤨 - TRY LOAD FILE : ")}${chalk.yellow(fileName)}`
    );
    const config = loadConfig(projectRoot, fileName);

    if (config.env) {
      config.env = {
        ...config.env,
        NODE_ENV: command.env
          ? command.env
          : config.env.NODE_ENV || "development",
        NODE_PORT: command.port ? command.port : config.env.NODE_PORT || 8201
      };
    } else {
      config.env = {
        NODE_ENV: command.env ? command.env : "development",
        NODE_PORT: command.port ? command.port : 8201
      };
    }
    if (config.watch === false) {
      config.watch = [];
    } else if (!config.watch) {
      config.watch = [
        path.join(projectRoot, "app/**/*.*"),
        path.join(projectRoot, "config/**/*.*"),
        path.join(projectRoot, "plugins/**/*.*")
      ];
    }
    if (config.ignore === false) {
      config.ignore = [];
    } else if (!config.ignore) {
      config.ignore = [];
    }
    if (config.verbose === undefined) config.verbose = true;
    if (config.inspect === undefined) config.inspect = true;
    if (command.debug) config.debug = command.debug;
    if (command.tsconfig) config.tsconfig = command.tsconfig;
    if (command.mock) config.mock = command.mock;
    config.inspect = String(config.inspect) === "true";
    const checkStr = String(config.typeCheck);
    const transpile = String(config.transpile);
    const compile = String(config.compile);
    config.typeCheck = checkStr === "undefined" ? true : checkStr === "true";
    config.transpile = transpile === "undefined" ? true : transpile === "true";
    config.compile = compile === "undefined" ? false : compile === "true";

    let useConfigCompile = false;
    let configWatchRoot = "";
    if (config.configCompiler) {
      const { enabled = false, configroot = "" } = config.configCompiler || {};
      configWatchRoot = path.resolve(projectRoot, configroot);
      if (enabled && config.compile) useConfigCompile = true;
    }

    let useMiddlewareCompile = false;
    let middleWatchRoot = "";
    if (config.middlewareCompiler) {
      const { enabled = false, root = "" } = config.middlewareCompiler || {};
      middleWatchRoot = path.resolve(projectRoot, root);
      if (enabled && config.compile) useMiddlewareCompile = true;
    }

    // ts-node register
    config.env.__TSCONFIG = config.tsconfig || "-";
    // fix: for tsconfig-paths support
    config.env.TS_NODE_PROJECT = config.tsconfig || "tsconfig.json";
    config.env.__TRANSPILE =
      config.typeCheck && !config.transpile ? "false" : "true";

    if (config.debug && config.debug === true) {
      config.env.DEBUG = "*";
    } else if (config.debug && config.debug !== true) {
      config.env.DEBUG = config.debug;
    }

    // 传递了 --inspect 参数，示例：
    // atc dev --inspect
    const node = `node${!!config.inspect ? " --inspect" : ""}`;

    let tsc_path_map = "";
    let ts_node = "";
    try {
      const tsnode = require.resolve("ts-node");
      const registerFile = path.resolve(__dirname, "../register");
      ts_node = `-r ${registerFile}`;
      tsc_path_map = `-r ${require
        .resolve("tsconfig-paths")
        .replace("/lib/index.js", "")}/register`;
      config.env.APP_EXTENSIONS = JSON.stringify(["js", "ts"]);
      config.exec = `${node} ${ts_node} ${tsc_path_map} ${path.join(
        projectRoot,
        "app/app.ts"
      )}`;
    } catch (error) {
      if ((<string>error.message || "").includes("ts-node")) {
        console.log(chalk.red("NEED TS-NODE"));
        return;
      } else {
        console.log(chalk.red(error));
        return;
      }
    }

    if (config.mock) {
      const url = config.mock === true ? "http://127.0.0.1:8001" : config.mock;
      config.env.HTTP_PROXY = url;
      config.env.HTTPS_PROXY = url;
    }

    async function runConfigs() {
      try {
        if (useConfigCompile) {
          const conf = config.configCompiler || {};
          const compileConf = {
            ...conf,
            tsconfig: conf.tsconfig || config.tsconfig
          };
          await doActionAwait(runConfigCompile, projectRoot, compileConf);
        }
      } catch (error) {
        console.log(chalk.red(error));
        return;
      }
    }

    async function runMiddlewares() {
      try {
        if (useMiddlewareCompile) {
          const conf = config.middlewareCompiler || {};
          const compileConf = {
            ...conf,
            tsconfig: conf.tsconfig || config.tsconfig
          };
          await doActionAwait(runMiddlewareCompile, projectRoot, compileConf);
        }
      } catch (error) {
        console.log(chalk.red(error));
        return;
      }
    }

    await runConfigs();
    await runMiddlewares();

    let changes: string[] = [];

    const tsnode_host = ts_node.split(" ")[1];
    const tspath_host = tsc_path_map.split(" ")[1];

    const forkConfig: ForkCmdOptions = {
      command: path.join(projectRoot, "app/app.ts"),
      args: [
        ...(!!config.inspect ? ["--inspect"] : []),
        "-r",
        tsnode_host,
        "-r",
        tspath_host
      ],
      env: config.env,
      check: config.transpile && config.typeCheck,
      cwd: projectRoot,
      token: refreshToken(),
      checkProcess: undefined,
      mainProcess: undefined,
      changes: []
    };

    chokidar
      .watch(config.watch || [], {
        ignored: config.ignore || []
      })
      .on("change", async (path: string | string[]) => {
        changes = [];
        if (typeof path === "string") {
          changes.push(path);
        } else {
          changes.push(...path);
        }
        if (changes.findIndex(i => i.startsWith(configWatchRoot)) >= 0) {
          console.log(chalk.yellow("CONFIGS RE-COMPILE："));
          await runConfigs();
        }
        if (changes.findIndex(i => i.startsWith(middleWatchRoot)) >= 0) {
          console.log(chalk.yellow("MIDDLEWARES RE-COMPILE："));
          await runMiddlewares();
        }
        forkConfig.mainProcess.on("exit", () => {
          startMainProcess(forkConfig);
        });
        forkConfig.token = refreshToken(forkConfig.token);
        forkConfig.checkProcess && forkConfig.checkProcess.kill();
        process.kill(forkConfig.mainProcess.pid);
      });

    const rootRegexp = new RegExp(projectRoot, "g");

    console.log("");
    console.log(chalk.yellow(STATR_BASH));
    console.log("");
    const script = config.exec.replace(rootRegexp, ".");
    console.log(`script ==> ${chalk.grey(script)}`);
    console.log("");
    console.log(chalk.green(ENVS));
    console.log("");
    console.log(chalk.cyan(`NODE_ENV: \t${config.env.NODE_ENV}`));
    console.log(chalk.cyan(`NODE_PORT: \t${config.env.NODE_PORT}`));
    if (config.env.DEBUG) {
      console.log(chalk.yellow(`DEBUG: \t${config.env.DEBUG}`));
    }
    if (config.env.HTTP_PROXY) {
      console.log(chalk.cyan(`HTTP_PROXY: \t${config.env.HTTP_PROXY}`));
    }
    if (config.env.HTTPS_PROXY) {
      console.log(chalk.cyan(`HTTPS_PROXY: \t${config.env.HTTPS_PROXY}`));
    }
    const LENGTH = config.watch && config.watch.length;
    if (LENGTH > 0) {
      console.log("");
      console.log(chalk.green(WATCHING));
      console.log("");
      for (let i = 0; i < LENGTH; i++) {
        console.log(
          `${i + 1} - ${chalk.yellow(config.watch[i].replace(rootRegexp, "."))}`
        );
      }
    } else {
      console.log("");
      console.log(
        chalk.green(`${WATCHING} : ${chalk.yellow("nothing here...")}`)
      );
    }
    const LENGTH_2 = config.ignore && config.ignore.length;
    if (LENGTH_2 > 0) {
      console.log("");
      console.log(chalk.green(IGNORED));
      console.log("");
      for (let i = 0; i < LENGTH_2; i++) {
        console.log(
          `${i + 1} - ${chalk.cyanBright(
            config.ignore[i].replace(rootRegexp, ".")
          )}`
        );
      }
    } else {
      console.log("");
      console.log(
        chalk.green(`${IGNORED} : ${chalk.cyanBright("nothing here...")}`)
      );
    }
    startMainProcess(forkConfig);
  }
};

function startMainProcess(config: ForkCmdOptions) {
  try {
    if (config.check) {
      config.checkProcess = startTypeCheck(config.cwd, config, config.token);
    }
  } catch (error) {
    console.warn(error);
  }
  console.log(chalk.green(BOOTSTRAP));
  console.log("");
  config.mainProcess = spawn("node", [...config.args, config.command], {
    env: {
      ...process.env,
      ...config.env
    },
    stdio: ["pipe", process.stdout, process.stderr]
  });
  return config.mainProcess;
}

function doActionAwait<T>(
  method: (p: string, c: T, f: (s: boolean, e?: Error) => void) => void,
  projectRoot: string,
  config: T
): Promise<void> {
  return new Promise((resolve, reject) => {
    method(projectRoot, config, (success, error) => {
      if (success) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
}

function startTypeCheck(
  projectRoot: string,
  config: any,
  token: CancellationToken
) {
  console.log("");
  console.log(chalk.blue(TYPE_CHECK));
  console.log("");
  const script = path.resolve(__dirname, "../process/check");
  console.log(chalk.gray(`script ==> ${script}`));
  console.log("");
  const child = childProcess.fork(script, [], {
    env: {
      TSCONFIG: path.resolve(projectRoot, config.tsconfig || "tsconfig.json")
    }
  });
  child.on("message", (message: { diagnostics?: NormalizedMessage[] }) => {
    const { diagnostics } = message;
    if (diagnostics) {
      if (diagnostics.length === 0) {
        console.log("");
        console.log(chalk.blue(TYPE_GOOD));
        console.log("");
        child.kill();
        return;
      }
      console.log(chalk.blue(`Type Syntax Errors : ${diagnostics.length}\n`));
      diagnostics.forEach(item => {
        const {
          type: _,
          code,
          severity,
          content,
          file,
          line,
          character
        } = item;
        console.log(
          chalk[severity === "error" ? "red" : "yellow"](
            `${String(
              severity
            ).toUpperCase()} in ${file}[${line},${character}] \nts${code ||
              0} : ${content}\n`
          )
        );
      });
      child.kill();
    } else {
      console.log(message);
    }
  });
  child.on("exit", () => console.log(TYPE_OVER));
  child.send(token);
  return child;
}

function refreshToken(token?: CancellationToken) {
  if (token && !token.isCancellationRequested()) token.cleanupCancellation();
  return (token = new CancellationToken(ts));
}
