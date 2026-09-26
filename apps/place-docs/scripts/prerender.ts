import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// The pages are compiled for the server into a folder outside the source tree,
// so they are loaded by address once they exist rather than imported by name.
const load = async (entry: string): Promise<{ render: () => string }> =>
  (await import(pathToFileURL(join(root, ".ssr", entry)).href)) as {
    render: () => string;
  };

// Each page holds no state and answers no events, so it is written once here and
// served as the file it produces. Nothing is sent to the browser to run: the
// stylesheet travels inside the document, which makes a page one request. The
// reference page carries one small script, because a list of nine hundred
// entries is unreadable without a way to narrow it, and twelve lines of DOM beat
// a framework for that.
const page = async (options: {
  entry: string;
  title: string;
  description: string;
  script?: string;
}): Promise<string> => {
  const styles = await readFile(join(root, "src/styles.css"), "utf8");
  const body = (await load(options.entry)).render();
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${options.title}</title>
    <meta name="description" content="${options.description}" />
    <link
      rel="icon"
      href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>📖</text></svg>"
    />
    <style>
${styles.trimEnd()}
    </style>
  </head>
  <body>
${body}${
    options.script === undefined
      ? ""
      : `
    <script>
${options.script.trimEnd()}
    </script>`
  }
  </body>
</html>
`;
};

await mkdir(join(root, "dist"), { recursive: true });

const written: string[] = [];
const write = async (file: string, document: string): Promise<void> => {
  await writeFile(join(root, "dist", file), document);
  written.push(file);
};

await write(
  "index.html",
  await page({
    entry: "guides.js",
    title: "Writing a place — voxelscape",
    description:
      "How to write a place script for voxelscape, from the first one to terrain, figures, and data.",
  }),
);

await write(
  "reference.html",
  await page({
    entry: "reference.js",
    title: "Place reference — voxelscape",
    description:
      "Every function, effect, and fact a voxelscape place script can reach, read out of the world's own sources.",
    // The filter is the one piece of behaviour either page has. It narrows the
    // rows by what they say, and shows how many are left, without knowing
    // anything about what a row is: every row carries the words it should match
    // on in `data-haystack`, and hiding one is a class rather than a rebuild.
    // Words are separated by spaces or commas, and a row has to carry every one
    // of them, so `hud remove` narrows to the effects that are both rather than
    // looking for that exact phrase in a row's text.
    // `String.raw` so the regular expression below reaches the browser as
    // written: in a plain template literal `\s` is consumed as an escape and
    // the character class silently becomes `[s,]`, which splits on the letter
    // s rather than on whitespace.
    script: String.raw`
const needle = document.getElementById("filter");
const rows = Array.from(document.querySelectorAll("[data-row]"));
const count = document.getElementById("shown");
const sections = Array.from(document.querySelectorAll("[data-section]"));

const terms = () =>
  needle.value
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((one) => one !== "");

const show = () => {
  const wanted = terms();
  let shown = 0;
  for (const row of rows) {
    const haystack = row.dataset.haystack;
    const hit = wanted.length === 0 || wanted.every((one) => haystack.includes(one));
    row.classList.toggle("hidden", !hit);
    if (hit) shown += 1;
  }
  for (const section of sections) {
    const any = section.querySelector("[data-row]:not(.hidden)");
    section.classList.toggle("hidden", !any);
  }
  const heading = sections.find((one) => !one.classList.contains("hidden"));
  if (count) {
    count.textContent =
      shown === rows.length
        ? rows.length + " entries"
        : shown + " of " + rows.length + " entries";
  }
  if (heading && wanted.length !== 0) {
    document.getElementById("jump").hidden = false;
    document.getElementById("jump").href = "#" + heading.id;
  } else {
    document.getElementById("jump").hidden = true;
  }
  // Every section is hidden by the loop above, so on a filter that matches
  // nothing the page would otherwise be blank. Say so, and repeat the filter
  // back, since the reader has to see what was looked for.
  document.getElementById("empty").hidden = shown !== 0;
};

needle.addEventListener("input", show);
document.getElementById("clear").addEventListener("click", () => {
  needle.value = "";
  needle.focus();
  show();
});
show();
`,
  }),
);

console.log(`wrote ${written.join(" and ")}`);
