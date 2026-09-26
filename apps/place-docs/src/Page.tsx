import type { JSX } from "@solidjs/web/jsx-runtime";

// The site root is one folder above these pages, which is what makes the link
// back to the front page and the two applications resolve from either one.
const base = import.meta.env.BASE_URL;

interface PageProps {
  title: string;
  children: JSX.Element;
}

/**
 * The frame both pages sit in: a masthead naming the two, and the footer the
 * whole site carries. The masthead is on both pages because a reader arriving
 * from a search engine lands on one of them and needs the other.
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
          <a href="reference.html">Reference</a>
        </nav>
        <p class="where">
          Writing a place for <a href={`${base}voxelscape/`}>voxelscape</a>
        </p>
      </header>

      <main>{props.children}</main>

      <footer>
        <p>
          The reference is read out of the world's own sources by{" "}
          <code>pnpm place-reference</code>, so it cannot drift from the code it
          describes. Both are open source, in one repository:{" "}
          <a href="https://github.com/big-mesh-studios/big-mesh-studios">
            github.com/big-mesh-studios/big-mesh-studios
          </a>
          .
        </p>
      </footer>
    </>
  );
}
