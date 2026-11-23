// يطبع النصوص العربي اللي في t("...") ومالهاش ترجمة في src/lib/i18n/en.ts
// التشغيل: node scripts/i18n-missing.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const en = readFileSync("src/lib/i18n/en.ts", "utf8");
const have = new Set([...en.matchAll(/^\s+("(?:[^"\\]|\\.)*"):/gm)].map((m) => JSON.parse(m[1])));
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => {
  const p = join(d, f);
  if (statSync(p).isDirectory()) { if (!p.includes("admin")) walk(p); } else if (/\.tsx?$/.test(f)) files.push(p);
});
walk("src");
const missing = new Set();
for (const f of files) {
  for (const m of readFileSync(f, "utf8").matchAll(/(?<![\w.])(?:t|l\.t)\(\s*("(?:[^"\\]|\\.)*")/g)) {
    const k = JSON.parse(m[1]);
    if (/[؀-ۿ]/.test(k) && !have.has(k)) missing.add(`${f}: ${k}`);
  }
}
console.log(missing.size ? [...missing].join("\n") : "كل النصوص مترجمة ✓");
