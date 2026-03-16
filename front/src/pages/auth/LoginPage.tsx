import { Button, Card, Form, Input, Typography, message } from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../../services/auth";

type LoginFormValues = {
  username: string;
  password: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      await login(values.username, values.password);
      const redirect = new URLSearchParams(location.search).get("redirect") || "/forms";
      navigate(redirect, { replace: true });
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {contextHolder}
      <Card className="login-page__card">
        <Typography.Title level={3}>登录数据填报</Typography.Title>
        <Typography.Paragraph type="secondary">
          默认账号：admin，默认密码：admin123
        </Typography.Paragraph>
        <Form<LoginFormValues>
          layout="vertical"
          initialValues={{ username: "admin", password: "admin123" }}
          onFinish={(values) => void handleFinish(values)}
        >
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Button block type="primary" htmlType="submit" loading={submitting}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
