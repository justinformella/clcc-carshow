import { readdirSync, readFileSync } from "fs";
import path from "path";
import NonprofitReader, { type NonprofitDoc } from "./NonprofitReader";

// Formation packet lives outside /public so it is only reachable through the
// auth-protected /admin route. Read at build time; edit the .md files to update.
const DOCS_DIR = path.join(process.cwd(), "content", "nonprofit");

function loadDocs(): NonprofitDoc[] {
  return readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => (a === "README.md" ? -1 : b === "README.md" ? 1 : a.localeCompare(b)))
    .map((file) => {
      const body = readFileSync(path.join(DOCS_DIR, file), "utf8");
      const h1 = body.match(/^#\s+(.+)$/m)?.[1] ?? file;
      const status = /TEMPLATE/i.test(h1) ? "Template" : /DRAFT/i.test(h1) ? "Draft" : "Guide";
      const title =
        file === "README.md"
          ? "Overview"
          : h1
              .replace(/\s+—\s+(DRAFT|TEMPLATE)\b.*$/i, "")
              .replace(/\s+—\s+Crystal Lake Cars and Caffeine NFP$/i, "");
      return {
        file,
        slug: file === "README.md" ? "overview" : file.replace(/^\d+-/, "").replace(/\.md$/, ""),
        number: file.match(/^(\d+)-/)?.[1] ?? null,
        title,
        status: file === "README.md" ? "Overview" : status,
        body,
      };
    });
}

export default function NonprofitPage() {
  return <NonprofitReader docs={loadDocs()} />;
}
