import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (...parts) => path.join(root, "src", ...parts);

async function read(relative) {
  return readFile(source(...relative.split("/")), "utf8");
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(fullPath) : [fullPath];
  }));
  return nested.flat().filter((file) => /\.(?:ts|tsx)$/.test(file));
}

test("backend has no unsafe raw SQL calls", async () => {
  const files = [
    ...await sourceFiles(source("app", "api")),
    ...await sourceFiles(source("lib")),
  ];
  const combined = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(combined, /\$(?:queryRawUnsafe|executeRawUnsafe)\b/);
});

test("product lists and locked details do not expose contact", async () => {
  const list = await read("app/api/getProducts/route.ts");
  const genericList = await read("app/api/products/route.ts");
  const detail = await read("app/api/products/[id]/route.ts");
  const favorites = await read("app/api/favorites/route.ts");
  const publicUserProducts = await read("app/api/user/[userId]/products/route.ts");
  assert.match(list, /contact:\s*["']\*{6}["']/);
  assert.doesNotMatch(list, /contact:\s*row\.contact/);
  assert.match(genericList, /products\.map\(withoutContact\)/);
  assert.match(detail, /const \{ user, contact, \.\.\.productFields \}/);
  assert.match(detail, /contact:\s*isUnlocked \? contact : ["']\*{6}["']/);
  assert.match(favorites, /const product = withoutContact\(item\.product\)/);
  assert.match(publicUserProducts, /const publicProduct = withoutContact\(p\)/);
});

test("identity, upload, and delete controls remain wired", async () => {
  const create = await read("app/api/addProduct/route.ts");
  const upload = await read("app/api/addProduct/uploadimage/route.ts");
  const product = await read("app/api/products/[id]/route.ts");
  assert.match(create, /getUserIdFromToken\(req\)/);
  assert.doesNotMatch(create, /userId:\s*body\.userId/);
  assert.match(upload, /getUserIdFromToken\(req\)/);
  assert.match(upload, /writeImage\(/);
  assert.match(product, /deleteStoredPublicFiles\(product\.images, \[`productimage\/\$\{product\.userId\}`\]\)/);
});

test("maintenance, recharge, and ad rewards fail closed", async () => {
  for (const endpoint of ["debug-data", "fix-products", "seed-distance"]) {
    assert.match(await read(`app/api/${endpoint}/route.ts`), /requireMaintenanceAdmin\(req\)/);
  }
  const recharge = await read("app/api/user/recharge/route.ts");
  assert.match(recharge, /Recharge is not configured/);
  assert.doesNotMatch(recharge, /prisma|queryRaw/i);
  const reward = await read("app/api/user/ad-reward/route.ts");
  assert.match(reward, /AD_REWARD_ENABLED !== ["']true["']/);
  assert.match(reward, /x-ad-signature/);
  assert.match(reward, /GET_LOCK/);
});

test("JWT, passwords, and audit actions fail closed", async () => {
  const auth = await read("lib/auth.ts");
  const login = await read("app/api/user/login/route.ts");
  const register = await read("app/api/user/register/route.ts");
  const audit = await read("app/api/admin/audit/route.ts");
  assert.match(auth, /JWT_SECRET is required/);
  assert.doesNotMatch(auth, /\|\|\s*["']secret["']/);
  assert.match(login, /from ["']bcrypt["']/);
  assert.match(register, /from ["']bcrypt["']/);
  assert.doesNotMatch(`${login}\n${register}`, /bcryptjs/);
  assert.match(audit, /action !== ["']pass["'] && action !== ["']reject["']/);
});

test("student verification images stay private and administrator-only", async () => {
  const upload = await read("app/api/user/verify/route.ts");
  const pending = await read("app/api/admin/pending/route.ts");
  const image = await read("app/api/admin/verification-image/route.ts");
  const middleware = await read("middleware.ts");
  const authorization = await read("lib/authorization.ts");
  assert.match(upload, /PRIVATE_UPLOAD_ROOT/);
  assert.match(upload, /verification\//);
  assert.doesNotMatch(upload, /public["'],\s*["']uploads["'],\s*["']verify/);
  assert.match(pending, /\/api\/admin\/verification-image\?userId=/);
  assert.match(image, /requireAdmin\(req\)/);
  assert.match(image, /Cache-Control["']:\s*["']private, no-store/);
  assert.match(middleware, /\/uploads\/verify\//);
  assert.match(authorization, /Bearer token required/);
});
