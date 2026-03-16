import { LoginOutlined, LogoutOutlined } from "@ant-design/icons";
import { Button, Layout, Space, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, logout, type CurrentUser } from "../services/auth";

const { Header, Content } = Layout;

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [messageApi, contextHolder] = message.useMessage();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem("dataapp.accessToken");
    if (!token) {
      setCurrentUser(null);
      return;
    }
    void getCurrentUser()
      .then(setCurrentUser)
      .catch(() => {
        logout();
        setCurrentUser(null);
      });
  }, [location.pathname]);

  return (
    <Layout className="app-layout">
      {contextHolder}
      <Header className="app-layout__header">
        <div className="app-layout__brand" onClick={() => navigate("/forms")} role="button" tabIndex={0}>
          <Typography.Text className="app-layout__brand-text">DataApp</Typography.Text>
        </div>
        <Space>
          {currentUser ? (
            <>
              <Typography.Text className="app-layout__user">{currentUser.username}</Typography.Text>
              <Button
                icon={<LogoutOutlined />}
                onClick={() => {
                  logout();
                  setCurrentUser(null);
                  messageApi.success("已退出登录");
                  navigate("/forms");
                }}
              >
                退出
              </Button>
            </>
          ) : (
            <Button
              icon={<LoginOutlined />}
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)}
            >
              登录
            </Button>
          )}
        </Space>
      </Header>
      <Content className="app-layout__content">
        <Outlet />
      </Content>
    </Layout>
  );
}
