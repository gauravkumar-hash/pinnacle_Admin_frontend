import { useState } from "react";
import {
  Layout,
  Typography,
  Table,
  Tag,
  Select,
  Space,
  Modal,
  Form,
  Input,
  Button,
  message,
  Descriptions,
  Avatar,
  Badge,
  Image,
  Card,
} from "antd";
import {
  EyeOutlined,
  EditOutlined,
  UserOutlined,
  FileImageOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthProvider";
import {
  getAppointmentRequests,
  updateRequestStatus,
  getSpecialists,
  AppointmentRequest,
} from "../../apis/specialist-care";
import dayjs from "dayjs";

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

const STATUS_COLOR: Record<string, string> = {
  pending: "orange",
  confirmed: "green",
  rejected: "red",
  completed: "blue",
};

export const AppointmentRequestsScreen = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [specialistFilter, setSpecialistFilter] = useState<
    number | undefined
  >();
  const [viewRecord, setViewRecord] = useState<AppointmentRequest | null>(null);
  const [statusModal, setStatusModal] = useState<AppointmentRequest | null>(
    null,
  );
  const [form] = Form.useForm();

  const onError = (status: number, msg: string) =>
    messageApi.error(`Error ${status}: ${msg}`);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["appointment-requests", statusFilter, specialistFilter],
    queryFn: () =>
      getAppointmentRequests(session!, onError, {
        status: statusFilter,
        specialist_id: specialistFilter,
      }),
    enabled: !!session,
  });

  const { data: specialists = [] } = useQuery({
    queryKey: ["specialists"],
    queryFn: () => getSpecialists(session!, onError),
    enabled: !!session,
  });

  const updateMutation = useMutation({
    mutationFn: (values: { status: string; status_message?: string }) =>
      updateRequestStatus(session!, statusModal!.id, values, onError),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-requests"] });
      messageApi.success("Status updated");
      setStatusModal(null);
      form.resetFields();
    },
  });

  const openStatusModal = (record: AppointmentRequest) => {
    setStatusModal(record);
    form.setFieldsValue({
      status: record.status,
      status_message: record.status_message,
    });
  };

  const columns = [
    {
      title: "Submitted",
      dataIndex: "submitted_at",
      render: (v: string) => dayjs(v).format("DD MMM YYYY HH:mm"),
      sorter: (a: AppointmentRequest, b: AppointmentRequest) =>
        dayjs(a.submitted_at).unix() - dayjs(b.submitted_at).unix(),
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Patient",
      render: (_: any, r: AppointmentRequest) => (
        <div>
          <div>
            <strong>{r.patient_name}</strong>
          </div>
          <div className="text-xs text-gray-500">{r.email}</div>
          <div className="text-xs text-gray-500">{r.contact_number}</div>
          {(r as any).insurance && (
            <div className="text-xs text-blue-600 mt-1">
              <SafetyOutlined /> {(r as any).insurance}
            </div>
          )}
          {(r as any).uploaded_images &&
            (r as any).uploaded_images.length > 0 && (
              <div className="text-xs text-green-600 mt-1">
                <FileImageOutlined /> {(r as any).uploaded_images.length}{" "}
                image(s)
              </div>
            )}
        </div>
      ),
    },
    {
      title: "Specialist",
      render: (_: any, r: AppointmentRequest) =>
        r.specialist ? (
          <Space>
            <Avatar
              src={r.specialist.image_url}
              icon={<UserOutlined />}
              size="small"
            />
            <span>
              {r.specialist.title} {r.specialist.name}
            </span>
          </Space>
        ) : (
          "-"
        ),
    },
    {
      title: "Preferred",
      render: (_: any, r: AppointmentRequest) => (
        <div>
          <div>{r.preferred_days || "-"}</div>
          <div className="text-xs text-gray-500">{r.preferred_time || ""}</div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v: string) => (
        <Badge
          color={STATUS_COLOR[v]}
          text={<Tag color={STATUS_COLOR[v]}>{v.toUpperCase()}</Tag>}
        />
      ),
    },
    {
      title: "Message",
      dataIndex: "status_message",
      ellipsis: true,
      render: (v: string) => v || <span className="text-gray-400">—</span>,
    },
    {
      title: "Actions",
      render: (_: any, record: AppointmentRequest) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => setViewRecord(record)}
          >
            View
          </Button>
          <Button
            icon={<EditOutlined />}
            size="small"
            type="primary"
            onClick={() => openStatusModal(record)}
          >
            Update Status
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ padding: "24px", background: "#fff", flex: 1 }}>
      {contextHolder}
      <Content>
        <div className="flex justify-between items-center mb-4">
          <Title level={4} style={{ margin: 0 }}>
            Appointment Requests
          </Title>
          <Space>
            <Select
              allowClear
              placeholder="Filter by status"
              style={{ width: 160 }}
              onChange={setStatusFilter}
            >
              <Option value="pending">Pending</Option>
              <Option value="confirmed">Confirmed</Option>
              <Option value="rejected">Rejected</Option>
              <Option value="completed">Completed</Option>
            </Select>
            <Select
              allowClear
              placeholder="Filter by specialist"
              style={{ width: 200 }}
              onChange={setSpecialistFilter}
            >
              {specialists.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.title} {s.name}
                </Option>
              ))}
            </Select>
          </Space>
        </div>

        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={requests}
          columns={columns}
        />

        {/* View Detail Modal */}
        <Modal
          title="Request Details"
          open={!!viewRecord}
          onCancel={() => setViewRecord(null)}
          footer={[
            <Button key="close" onClick={() => setViewRecord(null)}>
              Close
            </Button>,
            <Button
              key="update"
              type="primary"
              onClick={() => {
                setViewRecord(null);
                openStatusModal(viewRecord!);
              }}
            >
              Update Status
            </Button>,
          ]}
          width={700}
        >
          {viewRecord && (
            <>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Patient Name">
                  {viewRecord.patient_name}
                </Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  {viewRecord.patient_dob || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Contact">
                  {viewRecord.contact_number}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {viewRecord.email}
                </Descriptions.Item>

                {/* Insurance Information */}
                {(viewRecord as any).insurance && (
                  <Descriptions.Item
                    label={
                      <span>
                        <SafetyOutlined /> Insurance
                      </span>
                    }
                  >
                    <Tag color="blue">{(viewRecord as any).insurance}</Tag>
                  </Descriptions.Item>
                )}

                <Descriptions.Item label="Specialist">
                  {viewRecord.specialist
                    ? `${viewRecord.specialist.title} ${viewRecord.specialist.name}`
                    : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Preferred Days">
                  {viewRecord.preferred_days || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Preferred Time">
                  {viewRecord.preferred_time || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Reason">
                  {viewRecord.reason || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={STATUS_COLOR[viewRecord.status]}>
                    {viewRecord.status.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status Message">
                  {viewRecord.status_message || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Submitted At">
                  {dayjs(viewRecord.submitted_at).format("DD MMM YYYY HH:mm")}
                </Descriptions.Item>
              </Descriptions>

              {/* Uploaded Images Section */}
              {(viewRecord as any).uploaded_images &&
                (viewRecord as any).uploaded_images.length > 0 && (
                  <Card
                    title={
                      <span>
                        <FileImageOutlined /> Uploaded Images
                      </span>
                    }
                    size="small"
                    style={{ marginTop: 16 }}
                  >
                    <Space wrap size="middle">
                      <Image.PreviewGroup>
                        {(viewRecord as any).uploaded_images.map(
                          (url: string, idx: number) => (
                            <Image
                              key={idx}
                              src={url}
                              alt={`Upload ${idx + 1}`}
                              width={120}
                              height={120}
                              style={{
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid #d9d9d9",
                              }}
                              placeholder={
                                <div
                                  style={{
                                    width: 120,
                                    height: 120,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "#f0f0f0",
                                  }}
                                >
                                  <FileImageOutlined
                                    style={{ fontSize: 24, color: "#999" }}
                                  />
                                </div>
                              }
                            />
                          ),
                        )}
                      </Image.PreviewGroup>
                    </Space>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                      Click on images to view full size
                    </div>
                  </Card>
                )}
            </>
          )}
        </Modal>

        {/* Update Status Modal */}
        <Modal
          title="Update Request Status"
          open={!!statusModal}
          onCancel={() => {
            setStatusModal(null);
            form.resetFields();
          }}
          onOk={() => form.submit()}
          confirmLoading={updateMutation.isPending}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={(v) => updateMutation.mutate(v)}
          >
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true }]}
            >
              <Select>
                <Option value="pending">Pending</Option>
                <Option value="confirmed">Confirmed</Option>
                <Option value="rejected">Rejected</Option>
                <Option value="completed">Completed</Option>
              </Select>
            </Form.Item>
            <Form.Item name="status_message" label="Message to Patient">
              <Input.TextArea
                rows={3}
                placeholder="e.g. Your appointment is confirmed for Monday morning. Please arrive 10 minutes early."
              />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};
