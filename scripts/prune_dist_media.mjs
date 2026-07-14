import { readdir, readFile, rm, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST_MEDIA = resolve(ROOT, "dist/client/media");
const RUNTIME_MEDIA = resolve(ROOT, "content/governance/runtime-media.json");

async function filesWithin(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const pathname = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesWithin(pathname));
    else if (entry.isFile()) files.push(pathname);
  }
  return files;
}

function runtimePaths(records) {
  const paths = new Set();
  for (const record of records) {
    paths.add(record.fallback);
    for (const variant of record.variants ?? []) paths.add(variant.path);
  }
  return new Set([...paths].map((pathname) => {
    if (!pathname.startsWith("/media/derived/")) {
      throw new Error(`运行时媒体必须使用本地派生路径：${pathname}`);
    }
    return pathname.slice("/media/".length);
  }));
}

export async function pruneDistMedia() {
  const records = JSON.parse(await readFile(RUNTIME_MEDIA, "utf8"));
  const allowed = runtimePaths(records);
  const before = await filesWithin(DIST_MEDIA);

  for (const pathname of before) {
    const key = relative(DIST_MEDIA, pathname);
    if (!allowed.has(key)) await rm(pathname);
  }

  const after = await filesWithin(DIST_MEDIA);
  const actual = new Set(after.map((pathname) => relative(DIST_MEDIA, pathname)));
  const missing = [...allowed].filter((pathname) => !actual.has(pathname));
  const unexpected = [...actual].filter((pathname) => !allowed.has(pathname));
  if (missing.length || unexpected.length) {
    throw new Error(`部署媒体集不一致：missing=${missing.length}, unexpected=${unexpected.length}`);
  }

  const bytes = (await Promise.all(after.map((pathname) => stat(pathname))))
    .reduce((total, item) => total + item.size, 0);
  return {
    runtime_records: records.length,
    files_before: before.length,
    files_after: after.length,
    files_removed: before.length - after.length,
    bytes_after: bytes,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await pruneDistMedia(), null, 2));
}
