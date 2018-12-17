import chalk from "chalk";
import { Injectable } from "../../decorators/injectable";
import { Configs } from "../../services/Configs";
import { ENV } from "../../configs/env.config";

export enum SimpleLogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

function createStamp(date?: Date): string {
  const tData = date || new Date();
  return `[${chalk.cyan(`${tData.toLocaleDateString()} ${tData.toLocaleTimeString()}:${tData.getMilliseconds()}`)}]-`;
}

function createType(type: SimpleLogLevel): string {
  let color: string;
  let tps: string;
  switch (type) {
    case SimpleLogLevel.FATAL:
    case SimpleLogLevel.ERROR: [color, tps] = ["red", "ERROR"]; break;
    case SimpleLogLevel.WARN: [color, tps] = ["yellow", "WARN"]; break;
    case SimpleLogLevel.INFO: [color, tps] = ["blue", "INFO"]; break;
    case SimpleLogLevel.DEBUG: [color, tps] = ["green", "DEBUG"]; break;
    default: [color, tps] = ["white", "TRACE"];
  }
  return `[${chalk[color](tps)}]-`;
}

@Injectable()
export class SimpleLogger {

  private env: string;

  constructor(private configs: Configs) {
    this.env = configs.get(ENV).env;
  }

  private log(level: SimpleLogLevel, ...args: any[]) {
    const [title, details] = args;
    console.log(`${createStamp()}${createType(level)}${title}`);
    if (details) {
      console.log(details);
    }
  }

  public trace(title: string): void;
  public trace(title: string, details: any): void;
  public trace(...msg: any[]) {
    if (this.env === "production") return;
    return this.log(SimpleLogLevel.TRACE, ...msg);
  }

  public debug(title: string): void;
  public debug(title: string, details: any): void;
  public debug(...msg: any[]) {
    return this.log(SimpleLogLevel.DEBUG, ...msg);
  }

}