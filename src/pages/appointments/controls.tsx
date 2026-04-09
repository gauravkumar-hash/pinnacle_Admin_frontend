import {
  Layout,
  Typography,
  Card,
  Tabs,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Alert,
} from "antd";
import {
  BarChartOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  TeamOutlined,
} from "@ant-design/icons";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

// This will be a comprehensive appointment controls dashboard
export const AppointmentControlsScreen = () => {
  return (
    <Layout style={{ padding: "24px", background: "#fff", flex: 1 }}>
      <Content>
        <div className="mb-6">
          <Title level={3}>
            <BarChartOutlined className="mr-2" />
            Appointment Booking Controls
          </Title>
          <Text type="secondary">
            Manage appointment quotas, session limits, and booking controls
            across all clinics and corporate codes
          </Text>
        </div>

        <Tabs defaultActiveKey="overview" type="card">
          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                Overview
              </span>
            }
            key="overview"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Total Corporate Codes"
                    value={0}
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: "#3f8600" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Active Clinics"
                    value={0}
                    prefix={<ShopOutlined />}
                    valueStyle={{ color: "#1890ff" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Today's Appointments"
                    value={0}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: "#faad14" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Quota Usage"
                    value={0}
                    suffix="/ 100"
                    valueStyle={{ color: "#cf1322" }}
                  />
                </Card>
              </Col>
            </Row>

            <Card title="Quick Guide" className="mt-4">
              <Space
                direction="vertical"
                size="middle"
                style={{ width: "100%" }}
              >
                <div>
                  <Text strong>Corporate Code Quotas:</Text>
                  <br />
                  <Text type="secondary">
                    Set maximum total appointments and daily limits per
                    corporate code. Navigate to "Corporate Codes & Quotas" to
                    manage these settings.
                  </Text>
                </div>
                <div>
                  <Text strong>Clinic Session Limits:</Text>
                  <br />
                  <Text type="secondary">
                    Control the number of appointments each clinic can accept
                    per time session. Use "Operating Hours" to configure session
                    limits for each clinic.
                  </Text>
                </div>
                <div>
                  <Text strong>Branch Availability:</Text>
                  <br />
                  <Text type="secondary">
                    Manage which branches are available for appointments and
                    their operating hours. Go to "Onsite Branches" to
                    enable/disable clinics.
                  </Text>
                </div>
              </Space>
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <TeamOutlined />
                Corporate Quotas
              </span>
            }
            key="corporate"
          >
            <Card>
              <div className="flex justify-between items-center mb-4">
                <Text strong>Corporate Code Booking Limits</Text>
                <Button
                  type="link"
                  onClick={() =>
                    (window.location.href = "/appointments/corporate-codes")
                  }
                >
                  View Full Details →
                </Button>
              </div>
              <Text type="secondary">
                Configure total and daily appointment limits for each corporate
                code. This helps manage patient flow and prevent overbooking.
              </Text>
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <ClockCircleOutlined />
                Session Limits
              </span>
            }
            key="sessions"
          >
            <Card>
              <div className="flex justify-between items-center mb-4">
                <Text strong>Per-Clinic Session Capacity</Text>
                <Button
                  type="link"
                  onClick={() =>
                    (window.location.href = "/appointments/onsite-hours")
                  }
                >
                  Configure Operating Hours →
                </Button>
              </div>
              <Text type="secondary">
                Set the maximum number of appointments each clinic can handle
                per time session. This ensures clinics aren't overwhelmed and
                patients receive quality care.
              </Text>
              <div className="mt-4">
                <Alert
                  message="Note"
                  description="Session limits work in conjunction with operating hours. Make sure to configure both for effective appointment flow control."
                  type="info"
                  showIcon
                />
              </div>
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <ShopOutlined />
                Branch Settings
              </span>
            }
            key="branches"
          >
            <Card>
              <div className="flex justify-between items-center mb-4">
                <Text strong>Clinic Branch Management</Text>
                <Button
                  type="link"
                  onClick={() =>
                    (window.location.href = "/appointments/onsite-branches")
                  }
                >
                  Manage Branches →
                </Button>
              </div>
              <Text type="secondary">
                Control which clinic branches are available for appointment
                bookings. Temporarily disable branches during maintenance or
                staff shortages.
              </Text>
            </Card>
          </TabPane>
        </Tabs>
      </Content>
    </Layout>
  );
};
