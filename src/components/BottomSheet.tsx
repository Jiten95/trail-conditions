import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

const DISMISS_THRESHOLD_PX = 90;

/**
 * A sheet dismissed only by dragging it down past a threshold (no close
 * button) — drag is scoped to the handle zone so it never fights with
 * normal scrolling of the sheet's own content.
 */
export function BottomSheet({
  children,
  onClose,
  ariaLabel,
}: {
  children: ReactNode;
  onClose: () => void;
  ariaLabel: string;
}) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  function handlePointerDown(e: ReactPointerEvent) {
    startY.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (!dragging) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  }

  function handlePointerUp() {
    if (dragY > DISMISS_THRESHOLD_PX) {
      onClose();
    }
    setDragging(false);
    setDragY(0);
  }

  return (
    <div
      className="detail-overlay"
      role="dialog"
      aria-label={ariaLabel}
      style={{ transform: `translateY(${dragY}px)`, transition: dragging ? "none" : "transform 0.2s ease" }}
    >
      <div
        className="detail-overlay-handle-zone"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="detail-overlay-handle" />
        <span className="swipe-hint">Swipe down to close</span>
      </div>
      {children}
    </div>
  );
}
