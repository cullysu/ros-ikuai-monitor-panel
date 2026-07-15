import type { KeyboardEvent } from "react";
import type { MobileNativeSignalItem } from "./mobileNativeTypes";

export function MobileNativeObjectSelector({
  items,
  selectedObjectId,
  onSelectObject,
}: {
  items: MobileNativeSignalItem[];
  selectedObjectId?: string;
  onSelectObject?: (objectId: string) => void;
}) {
  const selectFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!onSelectObject) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % items.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex === null) return;
    const next = items[nextIndex];
    if (!next.objectId) return;
    event.preventDefault();
    onSelectObject(next.objectId);
    document.getElementById(`mn-object-option-${nextIndex}`)?.focus({ preventScroll: true });
  };

  return (
    <div className="mn-object-carousel" role="listbox" aria-labelledby="mn-signal-title" aria-orientation="horizontal">
      {items.map((item, index) => {
        const active = item.objectId === selectedObjectId;
        return (
          <button
            id={`mn-object-option-${index}`}
            className={`is-${item.tone || "trust"} ${active ? "is-selected" : ""}`}
            type="button"
            role="option"
            aria-selected={active}
            aria-controls="mn-inspection-panel"
            tabIndex={active ? 0 : -1}
            onClick={() => item.objectId && onSelectObject?.(item.objectId)}
            onKeyDown={(event) => selectFromKeyboard(event, index)}
            key={item.objectId || `${item.label}-${index}`}
            data-mobile-native-object-option={item.objectId}
          >
            <span>{item.label}</span><b>{item.value}</b>
            {item.note ? <small>{item.note}</small> : null}
          </button>
        );
      })}
    </div>
  );
}
