"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { useStore } from "zustand";
import {
  createEditorStore,
  type EditorStore,
  type EditorStoreState,
} from "./editor-store";

const EDITOR_STORE_CONTEXT = createContext<EditorStore | null>(null);

export function EditorStoreProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [store] = useState(createEditorStore);
  return (
    <EDITOR_STORE_CONTEXT.Provider value={store}>
      {children}
    </EDITOR_STORE_CONTEXT.Provider>
  );
}

export function useEditorStore<Selected>(
  selector: (state: EditorStoreState) => Selected,
): Selected {
  const store = useContext(EDITOR_STORE_CONTEXT);
  if (store === null)
    throw new Error("useEditorStore must be used within EditorStoreProvider");
  return useStore(store, selector);
}

export function useEditorStoreApi(): EditorStore {
  const store = useContext(EDITOR_STORE_CONTEXT);
  if (store === null)
    throw new Error(
      "useEditorStoreApi must be used within EditorStoreProvider",
    );
  return store;
}
