import { InboxOutlined } from "@ant-design/icons";
import { Button, Space, Typography } from "antd";

export function UploadFieldContent({
  buttonText,
  interactive,
  fileNames = [],
}: {
  buttonText: string;
  interactive: boolean;
  fileNames?: string[];
}) {
  return (
    <div className={["upload-field-content", interactive ? "is-interactive" : "is-readonly"].filter(Boolean).join(" ")}>
      <Space direction="vertical" size={8} className="upload-field-content__inner">
        <Button icon={<InboxOutlined />} disabled={!interactive}>
          {buttonText}
        </Button>
        <div className="upload-field-content__files">
          {fileNames.length > 0 ? (
            fileNames.map((fileName) => (
              <div key={fileName} className="upload-field-content__file">
                {fileName}
              </div>
            ))
          ) : (
            <Typography.Text type="secondary">已选文件将显示在这里</Typography.Text>
          )}
        </div>
      </Space>
    </div>
  );
}
