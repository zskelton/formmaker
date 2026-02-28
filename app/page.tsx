import { readdir } from "node:fs/promises";
import path from "node:path";
import PdfBrowser from "./pdf-browser";

export default async function Home() {
  const dataDir = path.join(process.cwd(), "app", "data");
  const entries = await readdir(dataDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return (
    <main className="viewerPage">
      <header className="pageHeader">
        <h1>Release of Information</h1>
      </header>
      <PdfBrowser files={files} />
      <div className="pageTag">Skelton Networks © 2026</div>
    </main>
  );
}