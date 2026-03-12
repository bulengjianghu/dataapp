import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Active,
  type Collision,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Card, Space, Tag, Typography } from "antd";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { PaletteTile, paletteItems } from "./ComponentPalette";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { selectFormId, selectNodesById } from "../../../store/selectors/editorSelectors";
import { addNode, moveNode, setFormId } from "../../../store/slices/formSchemaSlice";
import { PAGE_NODE_ID } from "../../../types/schema/node";
import { createPaletteNodePreset } from "./componentRegistry";

type EditorDndStatus = {
  activeId: string | null;
  overId: string | null;
  activeLabel: string | null;
};

const EditorDndStatusContext = createContext<EditorDndStatus>({
  activeId: null,
  overId: null,
  activeLabel: null,
});

export function useEditorDndStatus() {
  return useContext(EditorDndStatusContext);
}

function getActivePreview(active: Active, nodesById: ReturnType<typeof selectNodesById>) {
  const current = active.data.current;
  if (!current) {
    return null;
  }

  if (current.source === "palette" && typeof current.label === "string") {
    return {
      label: current.label,
      tag: "palette",
    };
  }

  if (current.source === "node" && typeof current.nodeId === "string") {
    const node = nodesById[current.nodeId];
    if (!node) {
      return null;
    }
    return {
      label: (node.props.label as string | undefined) ?? node.id,
      tag: node.type,
    };
  }

  return null;
}

function getPalettePreview(componentKey: string | undefined) {
  if (!componentKey) {
    return null;
  }
  return paletteItems.find((item) => item.key === componentKey) ?? null;
}

function getDroppablePriority(collision: Collision, nodesById: ReturnType<typeof selectNodesById>) {
  const type = collision.data?.droppableContainer?.data.current?.type as string | undefined;
  if (type === "children-end") {
    return 4;
  }
  if (type === "node") {
    const nodeId = collision.data?.droppableContainer?.data.current?.nodeId as string | undefined;
    const node = nodeId ? nodesById[nodeId] : null;
    return node?.type === "container" ? 2 : 3;
  }
  if (type === "container") {
    return 2;
  }
  if (type === "form-root") {
    return 1;
  }
  return 0;
}

export function EditorDndContextProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const formId = useAppSelector(selectFormId);
  const nodesById = useAppSelector(selectNodesById);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [disableDropAnimation, setDisableDropAnimation] = useState(false);

  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    const collisions = pointerHits.length > 0 ? pointerHits : rectIntersection(args);

    return [...collisions].sort((left, right) => {
      return getDroppablePriority(right, nodesById) - getDroppablePriority(left, nodesById);
    });
  };

  const status = useMemo(() => ({ activeId, overId, activeLabel }), [activeId, overId, activeLabel]);

  const onDragStart = (event: DragStartEvent) => {
    setDisableDropAnimation(false);
    setActiveId(String(event.active.id));
    const preview = getActivePreview(event.active, nodesById);
    setActiveLabel(preview?.label ?? null);
    setActiveTag(preview?.tag ?? null);
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
      setActiveLabel(null);
      setActiveTag(null);
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
      if (overType === "children-end" && typeof overData.parentId === "string") {
        const index = typeof overData.index === "number" ? overData.index : undefined;
        return { targetParentId: overData.parentId, targetIndex: index };
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
      setDisableDropAnimation(false);
      setActiveId(null);
      setOverId(null);
      setActiveLabel(null);
      setActiveTag(null);
      return;
    }

    if (activeData.source === "palette" && typeof activeData.componentKey === "string") {
      setDisableDropAnimation(true);
      if (!formId) {
        dispatch(setFormId("local-draft"));
      }
      const componentKey = activeData.componentKey as string;
      const preset = createPaletteNodePreset(componentKey);
      dispatch(
        addNode({
          type: preset.type,
          targetParentId: target.targetParentId,
          targetIndex: target.targetIndex,
          props: preset.props,
          layout: preset.layout,
        })
      );
    }

    if (activeData.source === "node" && typeof activeData.nodeId === "string") {
      setDisableDropAnimation(false);
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
    setActiveLabel(null);
    setActiveTag(null);
  };

  return (
    <EditorDndStatusContext.Provider value={status}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        {children}
        <DragOverlay zIndex={2000} dropAnimation={disableDropAnimation ? null : undefined}>
          {getPalettePreview(activeId?.startsWith("palette:") ? activeId.slice("palette:".length) : undefined) ? (
            <div className="editor-dnd-overlay editor-dnd-overlay--palette">
              <PaletteTile
                item={getPalettePreview(activeId?.startsWith("palette:") ? activeId.slice("palette:".length) : undefined)!}
              />
            </div>
          ) : activeLabel ? (
            <Card size="small" className="editor-dnd-overlay">
              <Space>
                <Tag color="processing">{activeTag ?? "drag"}</Tag>
                <Typography.Text strong>{activeLabel}</Typography.Text>
              </Space>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </EditorDndStatusContext.Provider>
  );
}
