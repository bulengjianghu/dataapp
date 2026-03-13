import { DeleteOutlined } from "@ant-design/icons";
import { Button, Popconfirm } from "antd";
import type { ReactNode } from "react";

export function SelectionOutline({
  selected,
  deleteMessage,
  onDelete,
  children,
}: {
  selected: boolean;
  deleteMessage: string;
  onDelete: () => void;
  children: ReactNode;
}) {
  return (
    <div className={["selection-outline", selected ? "is-selected" : ""].filter(Boolean).join(" ")}>
      {children}
      {selected ? (
        <>
          <div aria-hidden="true" className="selection-outline__stroke" />
          <div className="selection-outline__actions">
            <Popconfirm
              title="确认删除？"
              description={deleteMessage}
              okText="删除"
              cancelText="取消"
              onConfirm={onDelete}
            >
              <Button
                danger
                size="small"
                shape="circle"
                icon={<DeleteOutlined />}
                onClick={(event) => event.stopPropagation()}
              />
            </Popconfirm>
          </div>
        </>
      ) : null}
    </div>
  );
}
