import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const root = join(process.cwd(), "apps", "miniapp");
const appConfig = JSON.parse(await readFile(join(root, "app.json"), "utf8"));
const pages = Array.isArray(appConfig.pages) ? appConfig.pages : [];

assert(!pages.some((page) => page.includes("admin")), "app.json still registers an administrator page");
assert(pages.includes("pages/paper-site/index"), "paper platform WebView page is not registered");

const sourceFiles = await collect(root);
for (const file of sourceFiles.filter((path) => /\.(?:js|json|wxml|wxss)$/u.test(path))) {
  const content = await readFile(file, "utf8");
  assert(!content.includes("/pages/admin/"), `${file} still references the miniapp administrator route`);
  assert(!content.includes("goToAdminPanel"), `${file} still contains the administrator handler`);
}

const config = await readFile(join(root, "config.js"), "utf8");
assert(config.includes("paperSiteUrl"), "config.js does not expose paperSiteUrl");
process.stdout.write(`Miniapp boundary check passed (${pages.length} pages, no administrator route).\n`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries
    .filter((entry) => entry.name !== ".git")
    .map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? collect(path) : [path];
    }));
  return nested.flat();
}
