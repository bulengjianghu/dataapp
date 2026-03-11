import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type EditorDndStatus = {
  activeId: string | null;
  overId: string | null;
};

const EditorDndStatusContext = createContext<EditorDndStatus>({
  activeId: null,
  overId: null,
});

export function useEditorDndStatus() {
  return useContext(EditorDndStatusContext);
}

export function EditorDndContextProvider({ children }: { children: ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const status = useMemo(() => ({ activeId, overId }), [activeId, overId]);

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  };

  const onDragEnd = (_event: DragEndEvent) => {
    setActiveId(null);
    setOverId(null);
  };

  return (
    <EditorDndStatusContext.Provider value={status}>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        {children}
      </DndContext>
    </EditorDndStatusContext.Provider>
  );
}
