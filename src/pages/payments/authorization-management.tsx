import { useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  message,
  Descriptions,
  Typography,
  DatePicker,
  Input,
  Select,
  Statistic,
  Row,
  Col,
  Tooltip,
  Badge,
  Progress,
} from "antd";
import {
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { ColumnsType } from "antd/es/table";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface PaymentAuthorization {
  id: string;
  patient_name: string;
  patient_nric: string;
  authorized_amount: number;
  captured_amount: number;
  authorization_id: string;
  status:
    | "payment_authorized"
    | "payment_capture_pending"
    | "payment_captured"
    | "payment_failed"
    | "payment_canceled"
    | "payment_expired";
  created_at: string;
  authorization_expires_at: string;
  capture_attempted_at?: string;
  teleconsult_id?: string;
  teleconsult_status?: string;
  remarks?: Record<string, any>;
}

interface AuthorizationStats {
  total_authorizations: number;
  pending_capture: number;
  captured_today: number;
  expired_count: number;
  failed_count: number;
  total_authorized_amount: number;
  total_captured_amount: number;
  authorization_success_rate: number;
  capture_success_rate: number;
}

export default function PaymentAuthorizationManagement() {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null,
  );
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] =
    useState<PaymentAuthorization | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const queryClient = useQueryClient();

  // Fetch authorization statistics
  const { data: statsData, isLoading: statsLoading } =
    useQuery<AuthorizationStats>({
      queryKey: ["payment-authorization-stats"],
      queryFn: async () => {
        // TODO: Replace with actual API call
        const response = await fetch("/api/admin/payments/authorization-stats");
        if (!response.ok) throw new Error("Failed to fetch stats");
        return response.json();
      },
      refetchInterval: 30000, // Refresh every 30 seconds
    });

  // Fetch authorizations list
  const { data: authorizationsData, isLoading: authorizationsLoading } =
    useQuery<PaymentAuthorization[]>({
      queryKey: ["payment-authorizations", dateRange, statusFilter],
      queryFn: async () => {
        // TODO: Replace with actual API call
        const params = new URLSearchParams();
        if (dateRange) {
          params.append("start_date", dateRange[0].format("YYYY-MM-DD"));
          params.append("end_date", dateRange[1].format("YYYY-MM-DD"));
        }
        if (statusFilter) {
          params.append("status", statusFilter);
        }

        const response = await fetch(
          `/api/admin/payments/authorizations?${params}`,
        );
        if (!response.ok) throw new Error("Failed to fetch authorizations");
        return response.json();
      },
      refetchInterval: 10000, // Refresh every 10 seconds
    });

  // Capture payment mutation
  const captureMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await fetch(`/api/admin/payments/${paymentId}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to capture payment");
      }
      return response.json();
    },
    onSuccess: () => {
      message.success("Payment captured successfully");
      queryClient.invalidateQueries({ queryKey: ["payment-authorizations"] });
      queryClient.invalidateQueries({
        queryKey: ["payment-authorization-stats"],
      });
      setDetailsModalVisible(false);
    },
    onError: (error: Error) => {
      message.error(`Capture failed: ${error.message}`);
    },
  });

  // Void payment mutation
  const voidMutation = useMutation({
    mutationFn: async ({
      paymentId,
      reason,
    }: {
      paymentId: string;
      reason: string;
    }) => {
      const response = await fetch(`/api/admin/payments/${paymentId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to void payment");
      }
      return response.json();
    },
    onSuccess: () => {
      message.success("Payment voided successfully");
      queryClient.invalidateQueries({ queryKey: ["payment-authorizations"] });
      queryClient.invalidateQueries({
        queryKey: ["payment-authorization-stats"],
      });
      setDetailsModalVisible(false);
    },
    onError: (error: Error) => {
      message.error(`Void failed: ${error.message}`);
    },
  });

  const handleCapture = (record: PaymentAuthorization) => {
    Modal.confirm({
      title: "Capture Payment",
      content: `Capture ${record.authorized_amount.toFixed(2)} SGD from ${record.patient_name}?`,
      okText: "Capture",
      okType: "primary",
      onOk: () => captureMutation.mutate(record.id),
    });
  };

  const handleVoid = (record: PaymentAuthorization) => {
    Modal.confirm({
      title: "Void Authorization",
      content: (
        <div>
          <p>Void authorization for {record.patient_name}?</p>
          <p>
            This will release the held funds (
            {record.authorized_amount.toFixed(2)} SGD).
          </p>
          <Input.TextArea
            placeholder="Reason for voiding (optional)"
            id="void-reason"
            rows={3}
          />
        </div>
      ),
      okText: "Void",
      okType: "danger",
      onOk: () => {
        const reason =
          (document.getElementById("void-reason") as HTMLTextAreaElement)
            ?.value || "Manual void by admin";
        voidMutation.mutate({ paymentId: record.id, reason });
      },
    });
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<
      string,
      { color: string; icon: any; text: string }
    > = {
      payment_authorized: {
        color: "blue",
        icon: <ClockCircleOutlined />,
        text: "Authorized",
      },
      payment_capture_pending: {
        color: "orange",
        icon: <ExclamationCircleOutlined />,
        text: "Capture Pending",
      },
      payment_captured: {
        color: "green",
        icon: <CheckCircleOutlined />,
        text: "Captured",
      },
      payment_failed: {
        color: "red",
        icon: <CloseCircleOutlined />,
        text: "Failed",
      },
      payment_canceled: {
        color: "default",
        icon: <CloseCircleOutlined />,
        text: "Canceled",
      },
      payment_expired: {
        color: "volcano",
        icon: <ClockCircleOutlined />,
        text: "Expired",
      },
    };
    const config = statusConfig[status] || {
      color: "default",
      icon: null,
      text: status,
    };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const isExpired = (expiresAt: string) => dayjs(expiresAt).isBefore(dayjs());

  const columns: ColumnsType<PaymentAuthorization> = [
    {
      title: "Patient",
      dataIndex: "patient_name",
      key: "patient_name",
      width: 180,
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) =>
        record.patient_name
          .toLowerCase()
          .includes((value as string).toLowerCase()) ||
        record.patient_nric
          .toLowerCase()
          .includes((value as string).toLowerCase()),
      render: (name, record) => (
        <div>
          <div>
            <strong>{name}</strong>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.patient_nric}
          </Text>
        </div>
      ),
    },
    {
      title: "Amount",
      key: "amount",
      width: 150,
      render: (_, record) => (
        <div>
          <div>
            <Tooltip title="Authorized Amount">
              <Text strong>${record.authorized_amount.toFixed(2)}</Text>
            </Tooltip>
          </div>
          {record.captured_amount > 0 && (
            <div>
              <Tooltip title="Captured Amount">
                <Text type="success" style={{ fontSize: 12 }}>
                  Captured: ${record.captured_amount.toFixed(2)}
                </Text>
              </Tooltip>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 150,
      filters: [
        { text: "Authorized", value: "payment_authorized" },
        { text: "Capture Pending", value: "payment_capture_pending" },
        { text: "Captured", value: "payment_captured" },
        { text: "Failed", value: "payment_failed" },
        { text: "Canceled", value: "payment_canceled" },
        { text: "Expired", value: "payment_expired" },
      ],
      filteredValue: statusFilter ? [statusFilter] : null,
      render: (status, record) => (
        <Space direction="vertical" size="small">
          {getStatusTag(status)}
          {status === "payment_authorized" &&
            isExpired(record.authorization_expires_at) && (
              <Tag color="red" icon={<ExclamationCircleOutlined />}>
                Expired
              </Tag>
            )}
          {record.teleconsult_status && (
            <Tag color="purple" style={{ fontSize: 11 }}>
              {record.teleconsult_status}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Authorization",
      key: "authorization",
      width: 200,
      render: (_, record) => (
        <div>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              ID: {record.authorization_id.slice(-8)}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Created: {dayjs(record.created_at).format("MMM D, HH:mm")}
            </Text>
          </div>
          <div>
            {isExpired(record.authorization_expires_at) ? (
              <Text type="danger" style={{ fontSize: 11 }}>
                Expired: {dayjs(record.authorization_expires_at).fromNow()}
              </Text>
            ) : (
              <Text type="warning" style={{ fontSize: 11 }}>
                Expires: {dayjs(record.authorization_expires_at).fromNow()}
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedRecord(record);
              setDetailsModalVisible(true);
            }}
          >
            View Details
          </Button>
          {record.status === "payment_authorized" &&
            !isExpired(record.authorization_expires_at) && (
              <>
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleCapture(record)}
                  loading={captureMutation.isPending}
                >
                  Capture
                </Button>
                <Button
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleVoid(record)}
                  loading={voidMutation.isPending}
                >
                  Void
                </Button>
              </>
            )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <DollarOutlined /> Payment Authorization Management
      </Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
        Monitor and manage payment authorizations for telemed consultations
      </Text>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Capture"
              value={statsData?.pending_capture || 0}
              prefix={<ClockCircleOutlined style={{ color: "#1890ff" }} />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Captured Today"
              value={statsData?.captured_today || 0}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Authorization Rate"
              value={statsData?.authorization_success_rate || 0}
              suffix="%"
              precision={1}
              prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
              loading={statsLoading}
            />
            <Progress
              percent={statsData?.authorization_success_rate || 0}
              showInfo={false}
              status={
                statsData && statsData.authorization_success_rate >= 99
                  ? "success"
                  : "exception"
              }
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Capture Rate"
              value={statsData?.capture_success_rate || 0}
              suffix="%"
              precision={1}
              prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
              loading={statsLoading}
            />
            <Progress
              percent={statsData?.capture_success_rate || 0}
              showInfo={false}
              status={
                statsData && statsData.capture_success_rate >= 98
                  ? "success"
                  : "exception"
              }
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Search patient name or NRIC"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="YYYY-MM-DD"
          />
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 180 }}
            allowClear
          >
            <Select.Option value="payment_authorized">Authorized</Select.Option>
            <Select.Option value="payment_capture_pending">
              Capture Pending
            </Select.Option>
            <Select.Option value="payment_captured">Captured</Select.Option>
            <Select.Option value="payment_failed">Failed</Select.Option>
            <Select.Option value="payment_canceled">Canceled</Select.Option>
            <Select.Option value="payment_expired">Expired</Select.Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              queryClient.invalidateQueries({
                queryKey: ["payment-authorizations"],
              });
              queryClient.invalidateQueries({
                queryKey: ["payment-authorization-stats"],
              });
            }}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Authorizations Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={authorizationsData || []}
          loading={authorizationsLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} authorizations`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Details Modal */}
      <Modal
        title="Payment Authorization Details"
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedRecord && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Patient" span={2}>
              <strong>{selectedRecord.patient_name}</strong> (
              {selectedRecord.patient_nric})
            </Descriptions.Item>
            <Descriptions.Item label="Status" span={2}>
              {getStatusTag(selectedRecord.status)}
            </Descriptions.Item>
            <Descriptions.Item label="Authorized Amount">
              ${selectedRecord.authorized_amount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="Captured Amount">
              ${selectedRecord.captured_amount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="Authorization ID" span={2}>
              <Text code>{selectedRecord.authorization_id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Created At" span={2}>
              {dayjs(selectedRecord.created_at).format("YYYY-MM-DD HH:mm:ss")}
            </Descriptions.Item>
            <Descriptions.Item label="Expires At" span={2}>
              {dayjs(selectedRecord.authorization_expires_at).format(
                "YYYY-MM-DD HH:mm:ss",
              )}
              {isExpired(selectedRecord.authorization_expires_at) && (
                <Tag color="red" style={{ marginLeft: 8 }}>
                  Expired
                </Tag>
              )}
            </Descriptions.Item>
            {selectedRecord.capture_attempted_at && (
              <Descriptions.Item label="Capture Attempted At" span={2}>
                {dayjs(selectedRecord.capture_attempted_at).format(
                  "YYYY-MM-DD HH:mm:ss",
                )}
              </Descriptions.Item>
            )}
            {selectedRecord.teleconsult_id && (
              <Descriptions.Item label="Teleconsult ID" span={2}>
                <Text code>{selectedRecord.teleconsult_id}</Text>
              </Descriptions.Item>
            )}
            {selectedRecord.remarks &&
              Object.keys(selectedRecord.remarks).length > 0 && (
                <Descriptions.Item label="Remarks" span={2}>
                  <pre style={{ fontSize: 12 }}>
                    {JSON.stringify(selectedRecord.remarks, null, 2)}
                  </pre>
                </Descriptions.Item>
              )}
          </Descriptions>
        )}

        {selectedRecord &&
          selectedRecord.status === "payment_authorized" &&
          !isExpired(selectedRecord.authorization_expires_at) && (
            <Space
              style={{
                marginTop: 16,
                width: "100%",
                justifyContent: "flex-end",
              }}
            >
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleCapture(selectedRecord)}
                loading={captureMutation.isPending}
              >
                Capture Payment
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleVoid(selectedRecord)}
                loading={voidMutation.isPending}
              >
                Void Authorization
              </Button>
            </Space>
          )}
      </Modal>
    </div>
  );
}
