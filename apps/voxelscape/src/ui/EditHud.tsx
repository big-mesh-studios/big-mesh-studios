// Block-editing HUD: a crosshair at the screen centre (the pick target) and a
// bottom hotbar listing the collected blocks, the selected one highlighted.
// Driven by the shared `Inventory`'s `onChange` callback so counts and the
// selection refresh without wiring a per-block signal through the domain.
import {
  Component,
  createSignal,
  For,
  onCleanup,
  type Accessor,
} from "solid-js";
import { COLLECTABLE, type Inventory } from "../inventory";

export const EditHud: Component<{
  inventory: Inventory;
  /** Latest break/place message, shown above the hotbar. */
  status: Accessor<string>;
}> = (props) => {
  const inv = props.inventory;
  const order = Object.keys(COLLECTABLE).map(Number);
  const [items, setItems] = createSignal(
    order.map((id) => ({ id, name: COLLECTABLE[id], count: inv.count(id) })),
  );
  const [selected, setSelected] = createSignal(inv.selectedId);

  const refresh = (): void => {
    setItems(
      order.map((id) => ({ id, name: COLLECTABLE[id], count: inv.count(id) })),
    );
    setSelected(inv.selectedId);
  };
  inv.onChange = refresh;
  onCleanup(() => {
    if (inv.onChange === refresh) {
      inv.onChange = null;
    }
  });

  return (
    <div style={{ position: "absolute", inset: "0", "pointer-events": "none" }}>
      {/* crosshair */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "14px",
          height: "14px",
          display: "flex",
          "flex-direction": "column",
          "align-items": "center",
          "justify-content": "center",
        }}
      >
        <div
          style={{
            width: "2px",
            height: "14px",
            background: "rgba(0,0,0,0.7)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "14px",
            height: "2px",
            background: "rgba(0,0,0,0.7)",
          }}
        />
      </div>
      {/* hotbar */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "18px",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "8px",
        }}
      >
        <For each={items()}>
          {(item) => (
            <div
              style={{
                width: "52px",
                height: "52px",
                border: `2px solid ${
                  item.id === selected() ? "#ffd35c" : "rgba(255,255,255,0.4)"
                }`,
                background: "rgba(0,0,0,0.55)",
                "border-radius": "6px",
                color: "#fff",
                display: "flex",
                "flex-direction": "column",
                "align-items": "center",
                "justify-content": "center",
                font: "11px monospace",
              }}
            >
              <span style={{ "font-size": "16px" }}>{item.name[0]}</span>
              <span style={{ color: "#9be36b" }}>{item.count}</span>
            </div>
          )}
        </For>
        <div
          style={{
            position: "absolute",
            bottom: "82px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.9)",
            background: "rgba(0,0,0,0.45)",
            padding: "3px 8px",
            "border-radius": "4px",
            font: "11px monospace",
            "white-space": "pre",
          }}
        >
          {props.status() || "tap world to dig  •  button to place"}
        </div>
      </div>
    </div>
  );
};
