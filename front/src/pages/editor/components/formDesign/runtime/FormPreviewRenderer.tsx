import { Empty } from "antd";
import { useMemo } from "react";
import { useAppSelector } from "../../../../../store/hooks";
import { selectNodesById, selectPageChildrenIds, selectPageRootNode } from "../../../../../store/selectors/editorSelectors";
import { RecordFormCanvas } from "../../../../fill/components/RecordFormCanvas";
import type { RecordRuntimeData } from "../../../../fill/services/recordRuntime";

function createPreviewData(): RecordRuntimeData {
  return {
    mainData: {},
    detailTables: {},
  };
}

export function FormPreviewRenderer() {
  const nodesById = useAppSelector(selectNodesById);
  const pageRoot = useAppSelector(selectPageRootNode);
  const childrenIds = useAppSelector(selectPageChildrenIds);
  const previewData = useMemo(() => createPreviewData(), []);

  if (!pageRoot) {
    return <Empty description="页面根节点缺失" />;
  }

  return (
    <RecordFormCanvas
      nodesById={nodesById}
      pageChildren={childrenIds}
      data={previewData}
      readonly
      onMainValueChange={() => undefined}
      onAddDetailRow={() => undefined}
      onRemoveDetailRow={() => undefined}
      onDetailValueChange={() => undefined}
      onOpenRelationSelect={() => undefined}
      getRelationDisplayValue={() => undefined}
    />
  );
}
