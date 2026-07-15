import { useEffect, useRef, type KeyboardEvent } from "react";
import { MobileNativeIcon } from "./MobileNativeIcon";
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
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(0, items.findIndex((item) => item.objectId === selectedObjectId));

  useEffect(() => {
    const list = listRef.current;
    const option = list?.children.item(selectedIndex) as HTMLElement | null;
    if (!list || !option) return;
    const listRect = list.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();
    if (optionRect.left < listRect.left) list.scrollLeft -= listRect.left - optionRect.left;
    if (optionRect.right > listRect.right) list.scrollLeft += optionRect.right - listRect.right;
  }, [selectedIndex]);

  const selectIndex = (index: number, focus = false) => {
    const next = items[index];
    if (!next?.objectId || !onSelectObject) return;
    onSelectObject(next.objectId);
    if (focus) document.getElementById(`mn-object-option-${index}`)?.focus({ preventScroll: true });
  };

  const selectFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!onSelectObject) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % items.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    selectIndex(nextIndex, true);
  };

  return (
    <div className="mn-object-selector">
      {items.length > 1 ? (
        <div className="mn-object-selector-nav" data-mobile-native-object-navigation>
          <span aria-live="polite">{selectedIndex + 1} / {items.length}</span>
          <div>
            <button type="button" title="上一个对象" aria-label="上一个对象" disabled={selectedIndex === 0} onClick={() => selectIndex(selectedIndex - 1, true)}>
              <MobileNativeIcon name="back" size={18} />
            </button>
            <button type="button" title="下一个对象" aria-label="下一个对象" disabled={selectedIndex === items.length - 1} onClick={() => selectIndex(selectedIndex + 1, true)}>
              <MobileNativeIcon name="forward" size={18} />
            </button>
          </div>
        </div>
      ) : null}
      <div ref={listRef} className="mn-object-carousel" role="listbox" aria-labelledby="mn-signal-title" aria-orientation="horizontal">
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
              onClick={() => selectIndex(index)}
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
    </div>
  );
}
