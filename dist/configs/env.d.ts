interface IENV {
    /** 是否打印astroboy.ts的记录日志 */
    showTrace: boolean;
}
export declare const defaultEnv: IENV;
/** node env环境变量 */
export declare const ENV: import("@bonbons/di/dist/src/core/declares").IToken<IENV>;
export {};
