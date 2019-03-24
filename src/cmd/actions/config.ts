import path from "path";
import chalk from "chalk";
import get from "lodash/get";
import { loadConfig } from "../utils/load-config";
import { CommandPlugin, ConfigCompilerConfig } from "../base";
import { startChildProcess } from "../utils/execChild";

export interface IConfigCmdOptions {
  force?: boolean;
  config?: string;
}

export const ConfigPlugin: CommandPlugin = {
  name: "config",
  description: "编译configs文件",
  options: [["-F, --force", "清除所有configs，并重新编译"]],
  help: () => {
    console.log("");
    console.log("  Examples:");
    console.log("");
    console.log("    $ atc config");
    console.log("    $ atc config --force");
    console.log();
  },
  action(_, command: IConfigCmdOptions) {
    if (_ !== "config") return;
    console.log(chalk.green("========= [ASTROBOY.TS] <==> CONFIGS ========\n"));
    const projectRoot = process.cwd();
    const fileName = command.config || "atc.config.js";
    console.log(
      `${chalk.white("🤨 - TRY LOAD FILE : ")}${chalk.yellow(fileName)}\n`
    );

    let config: ConfigCompilerConfig;
    const defaultConfigs: ConfigCompilerConfig = {
      enabled: true,
      configroot: undefined,
      outputroot: undefined,
      force: false,
      tsconfig: undefined
    };
    try {
      const req = loadConfig(projectRoot, fileName);
      config = {
        ...defaultConfigs,
        ...get(req, "configCompiler", {}),
        tsconfig: req.tsconfig || config.tsconfig
      };
    } catch (_) {
      config = defaultConfigs;
    }

    if (command.force) config.force = String(command.force) === "true";
    if (command.config) config.tsconfig = String(command.config);

    runConfigCompile(projectRoot, config);
  }
};

export function runConfigCompile(
  projectRoot: string,
  config: ConfigCompilerConfig,
  intergradeOptions: { changes?: string[] } = {},
  then?: (success: boolean, error?: Error) => void
) {
  const { changes = [] } = intergradeOptions;
  try {
    const tsnode = require.resolve("ts-node");
    console.log("");
    console.log(chalk.cyan("⚙️ - COMPILE COMFIGS"));
    console.log("");
    const registerFile = path.resolve(__dirname, "../register");
    const initFile = path.resolve(__dirname, "../process/compile-configs");
    console.log(`script ==> ${chalk.grey(initFile)}`);
    console.log("");
    startChildProcess({
      args: ["-r", registerFile, initFile],
      type: "spawn",
      env: {
        CONFIG_ROOT: config.configroot || "-",
        OUTPUT_ROOT: config.outputroot || "-",
        FORCE: String(config.force === true),
        ENABLED: String(config.enabled === true),
        CHANGES: JSON.stringify(changes || []),
        __TSCONFIG: path.resolve(
          projectRoot,
          config.tsconfig || "tsconfig.json"
        )
      }
    })
      .then(() => {
        console.log(chalk.green("✅ - COMPILE CONFIGS OVER"));
        then && then(true);
      })
      .catch(error => {
        console.log(chalk.yellow("❌ - COMPILE CONFIGS FAILED"));
        console.log("");
        if (then) {
          return then(false, error);
        }
        console.log(chalk.red(error));
      });
  } catch (e) {
    console.log(chalk.yellow("❌ - COMPILE CONFIGS FAILED"));
    if (((<Error>e).message || "").includes("ts-node")) {
      console.log(chalk.red("NEED TS-NODE"));
      return;
    }
    throw e;
  }
}
