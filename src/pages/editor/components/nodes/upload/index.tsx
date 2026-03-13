import { Upload } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { useState } from "react";
import type { ComponentNodeDefinition } from "../types";
import { baseFieldGroup, defaultLayoutGroup } from "../shared";
import { UploadFieldContent } from "./UploadFieldContent";

function UploadRuntimeField({ buttonText }: { buttonText: string }) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handleChange: UploadProps["onChange"] = ({ fileList: nextFileList }) => {
    setFileList(nextFileList);
  };

  return (
    <Upload
      className="upload-runtime-field"
      beforeUpload={() => false}
      showUploadList={false}
      fileList={fileList}
      onChange={handleChange}
    >
      <UploadFieldContent buttonText={buttonText} interactive fileNames={fileList.map((file) => file.name)} />
    </Upload>
  );
}

export const uploadNodeDefinition: ComponentNodeDefinition = {
  key: "upload",
  title: "附件上传",
  createDefaultProps: () => ({
    component: "upload",
    label: "附件上传",
    required: false,
    helpText: "",
    buttonText: "点击上传",
  }),
  propertyGroups: [
    baseFieldGroup,
    {
      key: "component",
      title: "组件",
      fields: [
        {
          key: "buttonText",
          label: "按钮文案",
          target: "props",
          control: "input",
          placeholder: "请输入按钮文案",
        },
      ],
    },
    defaultLayoutGroup,
  ],
  renderContent: (node, mode) =>
    mode === "runtime" ? (
      <UploadRuntimeField buttonText={(node.props.buttonText as string | undefined) ?? "点击上传"} />
    ) : (
      <UploadFieldContent
        buttonText={(node.props.buttonText as string | undefined) ?? "点击上传"}
        interactive={false}
      />
    ),
};
