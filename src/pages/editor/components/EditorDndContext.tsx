import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { selectFormId, selectNodesById } from "../../../store/selectors/editorSelectors";
import { addNode, moveNode, setFormId } from "../../../store/slices/formSchemaSlice";
import { PAGE_NODE_ID } from "../../../types/schema/node";

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
  const dispatch = useAppDispatch();
  const formId = useAppSelector(selectFormId);
  const nodesById = useAppSelector(selectNodesById);
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

  const onDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current;
    const overData = event.over?.data.current;

    if (!activeData || !overData) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    const getInsertByOver = (): { targetParentId: string; targetIndex?: number } | null => {
      const overType = overData.type as string | undefined;
      if (overType === "form-root") {
        return { targetParentId: PAGE_NODE_ID };
      }
      if (overType === "container" && typeof overData.containerId === "string") {
        return { targetParentId: overData.containerId };
      }
      if (overType === "node" && typeof overData.nodeId === "string") {
        const overNode = nodesById[overData.nodeId];
        if (!overNode || !overNode.parentId) {
          return null;
        }
        const parent = nodesById[overNode.parentId];
        if (!parent) {
          return null;
        }
        const index = parent.childrenIds.findIndex((id) => id === overNode.id);
        return { targetParentId: overNode.parentId, targetIndex: index < 0 ? undefined : index };
      }
      return null;
    };

    const target = getInsertByOver();
    if (!target) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    if (activeData.source === "palette" && typeof activeData.componentKey === "string") {
      if (!formId) {
        dispatch(setFormId("local-draft"));
      }
      const componentKey = activeData.componentKey as string;
      const isContainer = componentKey === "container";
      dispatch(
        addNode({
          type: isContainer ? "container" : "field",
          targetParentId: target.targetParentId,
          targetIndex: target.targetIndex,
          props: {
            component: componentKey,
            label: isContainer ? "分组容器" : `新字段-${componentKey}`,
          },
        })
      );
    }

    if (activeData.source === "node" && typeof activeData.nodeId === "string") {
      dispatch(
        moveNode({
          nodeId: activeData.nodeId,
          targetParentId: target.targetParentId,
          targetIndex: target.targetIndex,
        })
      );
    }

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
