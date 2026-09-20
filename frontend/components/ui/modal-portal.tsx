"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};

/**
 * Renders popups directly under <body>, outside every page container, so no
 * ancestor's stacking context, transform or overflow can trap or hide them.
 * (The --dash-* theme variables live on :root, so they still apply.)
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}
