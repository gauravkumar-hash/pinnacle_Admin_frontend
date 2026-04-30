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
 


} from "antd";
import {
  EyeOutlined,
  EditOutlined,
  UserOutlined,

} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthProvider";
import {
  getAppointmentRequests,
  updateRequestStatus,
  AppointmentRequest,
} from "../../apis/specialist-care";
import dayjs from "dayjs";

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

const STATUS_COLOR: Record<string, string> = {
  pending: "orange",
  requested: "orange",
  confirmed: "green",
  rejected: "red",
  completed: "blue",
  rescheduled: "cyan",
  cancelled: "volcano",
};

export const AppointmentRequestsScreen = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [viewRecord, setViewRecord] = useState<AppointmentRequest | null>(null);
  const [statusModal, setStatusModal] = useState<AppointmentRequest | null>(null);
  const [form] = Form.useForm();

  const onError = (status: number, msg: string) =>
    messageApi.error(`Error ${status}: ${msg}`);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["appointment-requests", statusFilter],
    queryFn: () =>
      getAppointmentRequests(session!, onError, {
        status: statusFilter,
      }),
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
      sorter: (a: any, b: any) =>
        dayjs(a.submitted_at).unix() - dayjs(b.submitted_at).unix(),
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Patient",
      render: (_: any, r: any) => (
        <div>
          <div><strong>{r.patient_name}</strong></div>
          <div className="text-xs text-gray-500">{r.email}</div>
          <div className="text-xs text-gray-500">{r.contact_number}</div>
        </div>
      ),
    },
    {
      title: "Requested for",
      render: (_: any, r: any) => {
        if (r.specialist) {
          return (
            <Space>
              <Avatar src={r.specialist.image_url} icon={<UserOutlined />} size="small" />
              <span>{r.specialist.title} {r.specialist.name}</span>
            </Space>
          );
        }
        if (r.service) {
          return (
            <Space>
              <Avatar icon={<EditOutlined />} size="small" />
              <span>{r.service.service_name}</span>
            </Space>
          );
        }
        return "-";
      },
    },
    {
      title: "Preferred Slot",
      render: (_: any, r: any) => {
        // Logic to check if 'date' is an actual date string or a day name
        const isActualDate = r.date && /\d{4}-\d{2}-\d{2}/.test(r.date);
        return (
          <div>
            <div style={{ fontWeight: 600 }}>
              {isActualDate ? dayjs(r.date).format("DD MMM YYYY") : (r.date || "Flexible")}
            </div>
            <div className="text-xs text-gray-400">
              {r.time_slot || "Anytime"}
            </div>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v: string) => {
        const displayStatus = v === "pending" ? "requested" : v;
        return (
          <Tag color={STATUS_COLOR[v]}>{displayStatus.toUpperCase()}</Tag>
        );
      },
    },
    {
      title: "Actions",
      width: 150,
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
            Status
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
              style={{ width: 180 }}
              onChange={setStatusFilter}
            >
              <Option value="requested">Requested</Option>
              <Option value="confirmed">Confirmed</Option>
              <Option value="rescheduled">Rescheduled</Option>
              <Option value="cancelled">Cancelled</Option>
              <Option value="rejected">Rejected</Option>
              <Option value="completed">Completed</Option>
            </Select>
          </Space>
        </div>

        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={requests}
          columns={columns}
          scroll={{ x: "max-content" }}
        />

        {/* View Detail Modal */}
        <Modal
          title="Appointment Details"
          open={!!viewRecord}
          onCancel={() => setViewRecord(null)}
          footer={[
            <Button key="close" onClick={() => setViewRecord(null)}>Close</Button>,
            <Button
              key="update"
              type="primary"
              onClick={() => {
                const rec = viewRecord;
                setViewRecord(null);
                openStatusModal(rec!);
              }}
            >
              Update Status
            </Button>,
          ]}
          width={700}
        >
          {viewRecord && (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Patient Name">{viewRecord.patient_name}</Descriptions.Item>
              <Descriptions.Item label="Contact">{viewRecord.contact_number}</Descriptions.Item>
              <Descriptions.Item label="Email">{viewRecord.email}</Descriptions.Item>
              <Descriptions.Item label="Preferred Date">
                {/\d{4}-\d{2}-\d{2}/.test((viewRecord as any).date) 
                  ? dayjs((viewRecord as any).date).format("dddd, DD MMMM YYYY") 
                  : (viewRecord as any).date}
              </Descriptions.Item>
              <Descriptions.Item label="Preferred Time Slot">
                <Tag color="processing">{(viewRecord as any).time_slot}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLOR[viewRecord.status]}>{viewRecord.status.toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Message From Admin">
                {viewRecord.status_message || "—"}
              </Descriptions.Item>
            </Descriptions>
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
            <Form.Item name="status" label="New Status" rules={[{ required: true }]}>
              <Select>
                <Option value="confirmed">Confirmed</Option>
                <Option value="rescheduled">Rescheduled</Option>
                <Option value="cancelled">Cancelled</Option>
                <Option value="rejected">Rejected</Option>
                <Option value="completed">Completed</Option>
              </Select>
            </Form.Item>
            <Form.Item name="status_message" label="Note to Patient">
              <Input.TextArea rows={3} placeholder="Add a reason or instructions..." />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};
