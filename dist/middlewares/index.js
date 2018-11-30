"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const v4_1 = __importDefault(require("uuid/v4"));
const inject_server_1 = require("../inject-server");
exports.serverInit = (ctx, next) => __awaiter(this, void 0, void 0, function* () {
    const state = ctx.state || (ctx.state = {});
    const scopeId = state["$$scopeId"] = v4_1.default();
    inject_server_1.GlobalDI.createScope(scopeId, { ctx });
    console.log("start request");
    yield next();
});
//# sourceMappingURL=index.js.map