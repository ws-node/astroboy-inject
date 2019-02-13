"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const utils_1 = require("../utils");
const Injector_1 = require("../services/Injector");
const Scope_1 = require("../services/Scope");
const simple_logger_1 = require("../plugins/simple-logger");
const errors_options_1 = require("../options/errors.options");
const Configs_1 = require("../services/Configs");
/**
 * ## astroboy.ts初始化中间件
 * * 请确保此中间件的优先级足够高
 * * 建议优先级<1
 * @param ctx IContext
 * @param next 下一个中间件
 */
exports.serverInit = (ctx, next) => tslib_1.__awaiter(this, void 0, void 0, function* () {
    const { injector, scope, logger } = initRequestScope(ctx);
    try {
        yield next();
    }
    catch (error) {
        yield tryCatchGlobalError(injector, error);
    }
    finally {
        disposeRequestScope(scope, logger, injector);
    }
});
function initRequestScope(ctx) {
    const scopeId = utils_1.setScopeId(ctx);
    utils_1.GlobalDI.createScope(scopeId, { ctx });
    const injector = utils_1.GlobalDI.get(Injector_1.InjectService, scopeId);
    const logger = injector.get(simple_logger_1.SimpleLogger);
    const scope = injector.get(Scope_1.Scope);
    scope["init"](scopeId)["begin"]();
    logger.trace(`scope ${utils_1.setColor("cyan", utils_1.getShortScopeId(scopeId))} is init.`);
    return { injector, scope, logger };
}
function tryCatchGlobalError(injector, error) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const configs = injector.get(Configs_1.Configs);
        const { handler } = configs.get(errors_options_1.GLOBAL_ERROR);
        if (handler) {
            yield handler(error, injector, configs);
        }
    });
}
function disposeRequestScope(scope, logger, injector) {
    scope["end"]();
    const duration = scope.diration();
    logger.trace(`scope ${utils_1.setColor("cyan", utils_1.getShortScopeId(injector.scopeId))} is [${utils_1.setColor(duration > 500 ? "red" : duration > 200 ? "yellow" : "green", duration)} ms] disposed.`);
    injector["INTERNAL_dispose"] && injector["INTERNAL_dispose"]();
}
var core_1 = require("./core");
exports.injectScope = core_1.createMiddleware;
//# sourceMappingURL=index.js.map