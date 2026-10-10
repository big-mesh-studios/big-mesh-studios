import type { JSX } from "@solidjs/web/jsx-runtime";

// The site root is one folder above these pages, which is what makes the link
// back to the front page and the applications resolve from any of them.
const base = import.meta.env.BASE_URL;

interface PageProps {
  title: string;
  /** The world this page's vocabulary belongs to, named in the masthead. */
  app: string;
  /** The folder that world is served from, beside this documentation. */
  appHref: string;
  children: JSX.Element;
}

/**
 * The frame all three pages sit in: a masthead naming them, and the footer the
 * whole site carries. The masthead is on every page because a reader arriving
 * from a search engine lands on one of them and needs the other two.
 */
export function Page(props: PageProps) {
  return (
    <>
      <header>
        <a class="wordmark" href={`${base}`}>
          big mesh studios
        </a>
        <nav>
          <a href="index.html">Guides</a>
          <a href="reference.html">voxelscape</a>
          <a href="spacescape-reference.html">spacescape</a>
        </nav>
        <p class="where">
          Writing a place for{" "}
          <a href={`${base}${props.appHref}`}>{props.app}</a>
        </p>
      </header>

      <main>{props.children}</main>

      <footer>
        <p>
          Each reference is read out of its own world&rsquo;s sources by{" "}
          <code>pnpm place-reference</code>, so it cannot drift from the code it
          describes. Both worlds are open source, in one repository:{" "}
          <a href="https://github.com/big-mesh-studios/big-mesh-studios">
            github.com/big-mesh-studios/big-mesh-studios
          </a>
          .
        </p>
      </footer>
    </>
  );
}
