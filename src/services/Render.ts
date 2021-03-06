import isPlainObject from "lodash/isPlainObject";
import set from "lodash/set";
import { Injectable } from "../decorators/injectable";
import { AstroboyContext } from "./AstroboyContext";
import { resolveKeys } from "../utils";
import { JsonResolvers } from "../results/json";

export interface IRenderSetOptions {
  toSnake: boolean;
}

export interface IRenderGetOptions {}

export namespace Render {
  export interface Contract<
    S extends IRenderSetOptions = IRenderSetOptions,
    G extends IRenderGetOptions = IRenderGetOptions
  > {
    readonly views: { [prop: string]: any };
    setView(obj: { [prop: string]: any }): void;
    setView(obj: { [prop: string]: any }, options: Partial<S>): void;
    setView(key: string, obj: any): void;
    setView(key: string, obj: any, options: Partial<S>): void;
    getView(): { [prop: string]: any };
    getView(options: Partial<G>): { [prop: string]: any };
    getView(key: string): any;
    getView(key: string, options: Partial<G>): any;
  }
}

/**
 * ## 统一渲染服务
 * @description
 * @author Big Mogician
 * @export
 * @class Render
 */
@Injectable()
export class Render<
  SET extends IRenderSetOptions = IRenderSetOptions,
  GET extends IRenderGetOptions = IRenderGetOptions
> implements Render.Contract<SET, GET> {
  private _views: { [prop: string]: any } = {};

  public get views() {
    return this._views;
  }

  constructor(protected context: AstroboyContext) {
    this.init();
  }

  /**
   * ## Render init
   * * 重载方法已实现新的初始化逻辑
   * @description
   * @author Big Mogician
   * @protected
   * @memberof Render
   */
  protected init() {}

  public setView(obj: { [prop: string]: any }): void;
  public setView(obj: { [prop: string]: any }, options: Partial<SET>): void;
  public setView(key: string, obj: any): void;
  public setView(key: string, obj: any, options: Partial<SET>): void;
  public setView(...args: any[]) {
    const [p1, p2, p3] = args;
    let toSnake = false;
    let isObj = false;
    let keyStr: string = undefined;
    let toSave: any = undefined;
    if (isPlainObject(p1)) {
      const { toSnake: toS = false } = <Partial<SET>>(p2 || {});
      toSnake = toS;
      isObj = true;
      toSave = p1;
    } else {
      const { toSnake: toS = false } = <Partial<SET>>(p3 || {});
      toSnake = toS;
      keyStr = p1;
      toSave = p2;
    }
    if (isObj) {
      this._views = {
        ...this._views,
        ...(toSnake
          ? resolveKeys(JsonResolvers.snakecase, toSave || {})
          : toSave || {})
      };
    } else {
      set(
        this._views,
        keyStr,
        toSnake
          ? resolveKeys(JsonResolvers.snakecase, toSave || {})
          : toSave || {}
      );
    }
  }

  public getView(): { [prop: string]: any };
  public getView(options: Partial<GET>): { [prop: string]: any };
  public getView(key: string): any;
  public getView(key: string, options: Partial<GET>): any;
  public getView(...args: any[]) {
    const [a01, _] = args;
    // 没有使用options参数，因为当前GET没有处理逻辑
    if (typeof a01 === "string") {
      return this.views[a01];
    }
    return this.views;
  }
}
