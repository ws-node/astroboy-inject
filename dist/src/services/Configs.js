"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var di_1 = require("@bonbons/di");
exports.InjectScope = di_1.InjectScope;
exports.createOptions = (key) => ({ key: Symbol(key) });
exports.createConfig = (key) => ({ key: Symbol(`config::${key}`) });
class RealConfigCollection {
    constructor() {
        this.map = new Map();
    }
    set(token, entry) {
        this.map.set(token.key, { value: entry });
    }
    get(token) {
        const entry = this.map.get(token.key);
        return entry && entry.value;
    }
    toArray() {
        return Array.from(this.map.entries()).map(([sb, { value }]) => ({ token: { key: sb }, value }));
    }
}
exports.RealConfigCollection = RealConfigCollection;
/**
 * ## 全局配置容器
 * @description
 * @author Big Mogician
 * @export
 * @abstract
 * @class Configs
 * @implements {ReadonlyConfigs}
 */
class Configs {
}
exports.Configs = Configs;
//# sourceMappingURL=Configs.js.map