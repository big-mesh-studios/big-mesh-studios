import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// The page is compiled for the server into a folder outside the source tree,
// so it is loaded by address once it exists rather than imported by name.
const bundle = pathToFileURL(join(root, ".ssr/entry-server.js")).href;
const { render } = (await import(bundle)) as { render: () => string };

// The page holds no state and answers no events, so it is written once here
// and served as the file it produces. Nothing is sent to the browser to run:
// the stylesheet travels inside the document, which makes the whole page one
// request.
const styles = await readFile(join(root, "src/styles.css"), "utf8");
const body = render();

const document = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>big mesh studios</title>
    <meta
      name="description"
      content="A voxel editor, and a world that wears what it draws."
    />
    <link
      rel="icon"
      href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>🧊</text></svg>"
    />
    <style>
${styles.trimEnd()}
    </style>
  </head>
  <body>
${body}
  </body>
</html>
`;

await mkdir(join(root, "dist"), { recursive: true });
await writeFile(join(root, "dist/index.html"), document);
console.log("wrote dist/index.html");
