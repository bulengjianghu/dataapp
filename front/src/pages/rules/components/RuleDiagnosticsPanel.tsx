import { Alert, Card, Empty, Space, Tag, Typography } from "antd";
import type {
  InteractionRuleGraphState,
} from "../../../store/slices/interactionRuleGraphSlice";
import type { InteractionRuleDraftState } from "../../../store/slices/interactionRuleDraftSlice";
import type { InteractionRulePublishedVersion, InteractionRuleValidationResult } from "../services/interactionRules";

type RuleDiagnosticsPanelProps = {
  graphState: InteractionRuleGraphState;
  ruleDraft: InteractionRuleDraftState;
  validationResult: InteractionRuleValidationResult | null;
  publishedVersion: InteractionRulePublishedVersion | null;
};

export function RuleDiagnosticsPanel({
  graphState,
  ruleDraft,
  validationResult,
  publishedVersion,
}: RuleDiagnosticsPanelProps) {
  const errorCount = graphState.diagnostics.filter((item) => item.level === "error").length;
  const warningCount = graphState.diagnostics.filter((item) => item.level === "warning").length;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title="预编译诊断"
        size="small"
        extra={
          <Space size={8}>
            <Tag color={errorCount > 0 ? "error" : "default"}>{`${errorCount} 错误`}</Tag>
            <Tag color={warningCount > 0 ? "warning" : "default"}>{`${warningCount} 警告`}</Tag>
          </Space>
        }
      >
        {graphState.diagnostics.length === 0 ? (
          <Alert type="success" showIcon message="当前前端预编译未发现问题。" />
        ) : (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {graphState.diagnostics.map((item) => (
              <Alert
                key={item.id}
                type={item.level === "error" ? "error" : "warning"}
                showIcon
                message={item.message}
                description={item.code}
              />
            ))}
          </Space>
        )}
      </Card>

      <Card title="引用摘要" size="small">
        <pre className="rule-diagnostics__json">{JSON.stringify(graphState.references, null, 2)}</pre>
      </Card>

      <Card title="当前编译结果" size="small">
        {ruleDraft.compiledJson && Object.keys(ruleDraft.compiledJson).length > 0 ? (
          <pre className="rule-diagnostics__json">{JSON.stringify(ruleDraft.compiledJson, null, 2)}</pre>
        ) : (
          <Empty description="当前还没有可发布的编译结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      {validationResult ? (
        <Card title="服务端校验结果" size="small">
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Alert
              type={validationResult.valid ? "success" : "warning"}
              showIcon
              message={validationResult.valid ? "服务端校验通过" : "服务端校验未通过"}
            />
            <pre className="rule-diagnostics__json">{JSON.stringify(validationResult, null, 2)}</pre>
          </Space>
        </Card>
      ) : null}

      {publishedVersion ? (
        <Card
          title="已发布版本"
          size="small"
          extra={<Tag color="green">{`v${publishedVersion.versionNo}`}</Tag>}
        >
          <Typography.Paragraph type="secondary">
            发布时间：{publishedVersion.publishedAt || "未知"}
          </Typography.Paragraph>
          <pre className="rule-diagnostics__json">
            {JSON.stringify(publishedVersion.publishedSnapshotJson, null, 2)}
          </pre>
        </Card>
      ) : null}
    </Space>
  );
}
