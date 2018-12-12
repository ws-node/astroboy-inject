"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const { CTOR_PATH, ROUTER_PATH, ASTT_ENABLED, ASTT_ALWAYS, APP_ROOT, FILE_TYPE } = process.env;
// @ts-ignore
index_1.preInitFn({
    enabled: ASTT_ENABLED === "true",
    always: ASTT_ALWAYS === "true",
    fileType: FILE_TYPE,
    appRoot: APP_ROOT,
    // @ts-ignore
    ctorFolder: CTOR_PATH,
    routerFolder: ROUTER_PATH
}, ({ routers, error }) => {
    if (error) {
        throw error;
    }
    else {
        console.log(routers);
    }
});
//# sourceMappingURL=init.js.map