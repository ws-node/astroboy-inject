import path from "path";
import { createOptions } from "../../services/Configs";

export interface INunjunksRenderOptions {
  root: string;
  autoescape: true;
  throwOnUndefined: false;
  trimBlocks: false;
  lstripBlocks: false;
  cache: true;
}

export const defaultNunjunksOptions: INunjunksRenderOptions = {
  root: path.resolve(__dirname, "app/views"),
  cache: true,
  autoescape: true,
  throwOnUndefined: false,
  trimBlocks: false,
  lstripBlocks: false,
};

export const NUNJUNKS_OPTIONS = createOptions<INunjunksRenderOptions>("NUNJUNKS_OPTIONS");
