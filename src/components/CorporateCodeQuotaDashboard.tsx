import {
  Card,
  Statistic,
  Progress,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Tooltip,
  Alert,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";

const { Text } = Typography;

interface QuotaUsage {
  code: string;
  code_name: string;
  total_appointments: number;
  today_appointments: number;
  max_appointments_total: number | null;
  max_appointments_per_day: number | null;
  quota_remaining_total: number | null;
  quota_remaining_today: number | null;
  last_appointment_date: string | null;
}

interface QuotaDashboardProps {
  codeId: string;
  codeName: string;
}

export function CorporateCodeQuotaDashboard({
  codeId,
  codeName,
}: QuotaDashboardProps) {
  const {
    data: quotaData,
    isLoading,
    error,
  } = useQuery<QuotaUsage>({
    queryKey: ["corporate-code-quota", codeId],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/appointments/v1/corporate-codes/${codeId}/quota-usage`,
      );
      if (!response.ok) throw new Error("Failed to fetch quota usage");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card loading>
        <Statistic title="Loading quota information..." value="..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="Failed to load quota information"
        description={(error as Error).message}
      />
    );
  }

  if (!quotaData) return null;

  const hasQuotaLimits =
    quotaData.max_appointments_total !== null ||
    quotaData.max_appointments_per_day !== null;

  if (!hasQuotaLimits) {
    return (
      <Alert
        type="info"
        message="No Quota Limits"
        description="This corporate code has unlimited appointments."
        icon={<CheckCircleOutlined />}
      />
    );
  }

  const getTotalQuotaPercentage = () => {
    if (!quotaData.max_appointments_total) return 0;
    return (
      (quotaData.total_appointments / quotaData.max_appointments_total) * 100
    );
  };

  const getDailyQuotaPercentage = () => {
    if (!quotaData.max_appointments_per_day) return 0;
    return (
      (quotaData.today_appointments / quotaData.max_appointments_per_day) * 100
    );
  };

  const getQuotaStatus = (percentage: number) => {
    if (percentage >= 90) return "exception";
    if (percentage >= 75) return "normal";
    return "success";
  };

  const getQuotaColor = (percentage: number) => {
    if (percentage >= 90) return "#ff4d4f";
    if (percentage >= 75) return "#faad14";
    return "#52c41a";
  };

  return (
    <Card
      title={
        <Space>
          <TeamOutlined />
          <span>Appointment Quota Usage</span>
          <Tag color="blue">{codeName}</Tag>
        </Space>
      }
      bordered
    >
      <Row gutter={[16, 16]}>
        {/* Total Quota */}
        {quotaData.max_appointments_total !== null && (
          <Col xs={24} md={12}>
            <Card type="inner">
              <Statistic
                title="Total Appointments Quota"
                value={quotaData.total_appointments}
                suffix={`/ ${quotaData.max_appointments_total}`}
                prefix={
                  <TeamOutlined
                    style={{ color: getQuotaColor(getTotalQuotaPercentage()) }}
                  />
                }
              />
              <Progress
                percent={getTotalQuotaPercentage()}
                status={getQuotaStatus(getTotalQuotaPercentage())}
                strokeColor={getQuotaColor(getTotalQuotaPercentage())}
                style={{ marginTop: 16 }}
              />
              <div style={{ marginTop: 8 }}>
                <Space split="|">
                  <Tooltip title="Remaining quota">
                    <Text type="secondary">
                      Remaining:{" "}
                      <strong>{quotaData.quota_remaining_total}</strong>
                    </Text>
                  </Tooltip>
                  {getTotalQuotaPercentage() >= 90 && (
                    <Tag color="red" icon={<ExclamationCircleOutlined />}>
                      90% Used
                    </Tag>
                  )}
                  {getTotalQuotaPercentage() >= 100 && (
                    <Tag color="error" icon={<ExclamationCircleOutlined />}>
                      Quota Exhausted
                    </Tag>
                  )}
                </Space>
              </div>
            </Card>
          </Col>
        )}

        {/* Daily Quota */}
        {quotaData.max_appointments_per_day !== null && (
          <Col xs={24} md={12}>
            <Card type="inner">
              <Statistic
                title="Today's Appointments Quota"
                value={quotaData.today_appointments}
                suffix={`/ ${quotaData.max_appointments_per_day}`}
                prefix={
                  <CalendarOutlined
                    style={{ color: getQuotaColor(getDailyQuotaPercentage()) }}
                  />
                }
              />
              <Progress
                percent={getDailyQuotaPercentage()}
                status={getQuotaStatus(getDailyQuotaPercentage())}
                strokeColor={getQuotaColor(getDailyQuotaPercentage())}
                style={{ marginTop: 16 }}
              />
              <div style={{ marginTop: 8 }}>
                <Space split="|">
                  <Tooltip title="Remaining quota for today">
                    <Text type="secondary">
                      Remaining:{" "}
                      <strong>{quotaData.quota_remaining_today}</strong>
                    </Text>
                  </Tooltip>
                  {getDailyQuotaPercentage() >= 90 && (
                    <Tag color="red" icon={<ExclamationCircleOutlined />}>
                      90% Used
                    </Tag>
                  )}
                  {getDailyQuotaPercentage() >= 100 && (
                    <Tag color="error" icon={<ExclamationCircleOutlined />}>
                      Daily Quota Full
                    </Tag>
                  )}
                </Space>
              </div>
            </Card>
          </Col>
        )}

        {/* Last Appointment */}
        {quotaData.last_appointment_date && (
          <Col span={24}>
            <Card type="inner" size="small">
              <Space>
                <ClockCircleOutlined />
                <Text type="secondary">Last appointment:</Text>
                <Text strong>
                  {new Date(quotaData.last_appointment_date).toLocaleString()}
                </Text>
              </Space>
            </Card>
          </Col>
        )}
      </Row>

      {/* Warning Messages */}
      {(getTotalQuotaPercentage() >= 90 || getDailyQuotaPercentage() >= 90) && (
        <Alert
          type="warning"
          message="Quota Alert"
          description={
            <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
              {getTotalQuotaPercentage() >= 90 && (
                <li>
                  Total quota is at {getTotalQuotaPercentage().toFixed(1)}%
                  capacity
                </li>
              )}
              {getDailyQuotaPercentage() >= 90 && (
                <li>
                  Daily quota is at {getDailyQuotaPercentage().toFixed(1)}%
                  capacity
                </li>
              )}
            </ul>
          }
          icon={<ExclamationCircleOutlined />}
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
}
