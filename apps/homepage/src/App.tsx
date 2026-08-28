import type { JSX } from "@solidjs/web/jsx-runtime";

// Both applications are folders beside this page on the same site, so their
// addresses are the site root with a name after it.
const base = import.meta.env.BASE_URL;

interface AppCardProps {
  name: string;
  href: string;
  accent: string;
  call: string;
  mark: JSX.Element;
  children: JSX.Element;
}

/** One of the two applications, as a panel that links to it. */
function AppCard(props: AppCardProps) {
  return (
    <a class="card" href={props.href} style={{ "--accent": props.accent }}>
      {props.mark}
      <h2>{props.name}</h2>
      <p>{props.children}</p>
      <span class="call">{props.call}</span>
    </a>
  );
}

/** A stack of three faces, drawn in the colour the panel is keyed to. */
function Mark(props: {
  colour: string;
  top: string;
  left: string;
  right: string;
}) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d={props.top} fill={props.colour} />
      <path d={props.left} fill={props.colour} opacity="0.72" />
      <path d={props.right} fill={props.colour} opacity="0.45" />
    </svg>
  );
}

/** The whole of the front page. */
export function App() {
  return (
    <>
      <header>
        <h1>big mesh studios</h1>
        <p>A voxel editor, and a world that wears what it draws.</p>
      </header>

      <main>
        <AppCard
          name="rm-stacker"
          href={`${base}rm-stacker/`}
          accent="#6abe30"
          call="Open the editor"
          mark={
            <Mark
              colour="#6abe30"
              top="M24 4 44 15v11L24 15 4 26V15Z"
              left="M4 26 24 15v11L4 37Z"
              right="M44 26 24 15v11l20 11Z"
            />
          }
        >
          Draw the six faces of a box and it becomes a voxel model. Save it, or
          publish it to your own account for anyone to use.
        </AppCard>

        <AppCard
          name="voxelscape"
          href={`${base}voxelscape/`}
          accent="#4a8fe7"
          call="Enter the world"
          mark={
            <Mark
              colour="#4a8fe7"
              top="M24 6 42 16 24 26 6 16Z"
              left="M6 16v10l18 10V26Z"
              right="M42 16v10L24 36V26Z"
            />
          }
        >
          An endless world of generated terrain to walk through, build in, and
          share with whoever else is in it. Its monsters wear models drawn next
          door.
        </AppCard>
      </main>

      <footer>
        Both are open source, in one repository:{" "}
        <a href="https://github.com/big-mesh-studios/big-mesh-studios">
          github.com/big-mesh-studios/big-mesh-studios
        </a>
        .
      </footer>
    </>
  );
}
