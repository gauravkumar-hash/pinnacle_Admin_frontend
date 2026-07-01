import { useState } from "react";
import {
  Layout,
  Typography,
  Button,
  Table,
  Switch,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  message,
  Popconfirm,
  Tag,
  Avatar,
  Upload,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthProvider";
import {
  getSpecialisations,
  getSpecialists,
  createSpecialist,
  updateSpecialist,
  deleteSpecialist,
  Specialist,
} from "../../apis/specialist-care";

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DayAvailabilityPicker = ({
  value = {},
  onChange,
}: {
  value?: Record<string, string[]>;
  onChange?: (v: Record<string, string[]>) => void;
}) => {
  const toggle = (day: string, slot: string) => {
    const current = value[day] ?? [];
    const updated = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot];
    const next = { ...value };
    if (updated.length === 0) delete next[day];
    else next[day] = updated;
    onChange?.(next);
  };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", paddingBottom: 4 }}>Day</th>
          <th style={{ textAlign: "center", paddingBottom: 4 }}>AM</th>
          <th style={{ textAlign: "center", paddingBottom: 4 }}>PM</th>
        </tr>
      </thead>
      <tbody>
        {DAYS.map((day) => (
          <tr key={day}>
            <td style={{ padding: "4px 0" }}>{day}</td>
            <td style={{ textAlign: "center" }}>
              <Checkbox
                checked={(value[day] ?? []).includes("AM")}
                onChange={() => toggle(day, "AM")}
              />
            </td>
            <td style={{ textAlign: "center" }}>
              <Checkbox
                checked={(value[day] ?? []).includes("PM")}
                onChange={() => toggle(day, "PM")}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const SpecialistsScreen = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Specialist | null>(null);
  const [form] = Form.useForm();
  const [imageFile, setImageFile] = useState<UploadFile[]>([]);
  const [clinicPhotoFile, setClinicPhotoFile] = useState<UploadFile[]>([]);

  const onError = (status: number, msg: string) =>
    messageApi.error(`Error ${status}: ${msg}`);

  const { data: specialists = [], isLoading } = useQuery({
    queryKey: ["specialists"],
    queryFn: () => getSpecialists(session!, onError),
    enabled: !!session,
  });

  const { data: specialisations = [] } = useQuery({
    queryKey: ["specialisations"],
    queryFn: () => getSpecialisations(session!, onError),
    enabled: !!session,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      const formData = new FormData();

      // Add required fields (always include these)
      formData.append(
        "specialisation_id",
        values.category_id?.toString() || "",
      );
      formData.append("name", values.name || "");
      formData.append("appointment_email", values.appointment_email || "");
      formData.append("clinic_name", values.clinic_name || "");
      formData.append("consultation_fee", values.consultation_fee || "");

      // Add optional fields
      formData.append("title", values.title || "");
      formData.append("credentials", values.credentials || "");
      formData.append("short_bio", values.short_bio || "");
      formData.append("full_bio", values.full_bio || "");
      formData.append("languages", values.languages || "");
      formData.append("contact_phone", values.contact_phone || "");
      formData.append("years_of_practice", values.years_of_practice?.toString() || "");
      formData.append("hospital_affiliations", values.hospital_affiliations || "");
      formData.append("board_certifications", values.board_certifications || "");
      formData.append("awards", values.awards || "");
      formData.append("insurance_tpa", values.insurance_tpa || "");
      formData.append("insurance_shield_plan", values.insurance_shield_plan || "");

      // Handle available_days
      const availableDays = Array.isArray(values.available_days)
        ? values.available_days.join(",")
        : values.available_days || "";
      formData.append("available_days", availableDays);

      // Handle available_time_slots
      const availableTimeSlots = Array.isArray(values.available_time_slots)
        ? values.available_time_slots.join(",")
        : values.available_time_slots || "";
      formData.append("available_time_slots", availableTimeSlots);
      if (values.day_availability && Object.keys(values.day_availability).length > 0) {
        formData.append("day_availability", JSON.stringify(values.day_availability));
      }

      formData.append("display_order", values.display_order?.toString() || "0");
      formData.append("active", values.active ? "true" : "false");

      // Add image files if selected
      if (imageFile.length > 0 && imageFile[0].originFileObj) {
        formData.append("image", imageFile[0].originFileObj);
      }
      if (clinicPhotoFile.length > 0 && clinicPhotoFile[0].originFileObj) {
        formData.append("clinic_photo", clinicPhotoFile[0].originFileObj);
      }

      if (editing)
        return updateSpecialist(session!, editing.id, formData, onError);
      return createSpecialist(session!, formData, onError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialists"] });
      messageApi.success(editing ? "Specialist updated" : "Specialist created");
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      setImageFile([]);
      setClinicPhotoFile([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSpecialist(session!, id, onError),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialists"] });
      messageApi.success("Specialist deleted");
    },
  });

  const toggleActive = (record: Specialist) => {
    updateSpecialist(
      session!,
      record.id,
      { active: !record.active },
      onError,
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ["specialists"] });
    });
  };

  const openEdit = (record: Specialist) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      category_id: record.specialisation_id,
      available_days: record.available_days ? record.available_days.split(",") : [],
      available_time_slots: (record as any).available_time_slots
        ? (record as any).available_time_slots.split(",")
        : [],
      day_availability: record.day_availability ?? {},
    });

    // Set existing images
    if (record.image_url) {
      setImageFile([
        { uid: "-1", name: "image", status: "done", url: record.image_url },
      ]);
    } else {
      setImageFile([]);
    }
    if (record.clinic_photo_path) {
      setClinicPhotoFile([
        { uid: "-2", name: "clinic_photo", status: "done", url: record.clinic_photo_path },
      ]);
    } else {
      setClinicPhotoFile([]);
    }

    setModalOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setImageFile([]);
    setClinicPhotoFile([]);
    setModalOpen(true);
  };

  const getSpecialisationName = (id: number) =>
    specialisations.find((s) => s.id === id)?.name ?? "-";

  const columns = [
    { title: "Order", dataIndex: "display_order", width: 70 },
    {
      title: "Doctor",
      render: (_: any, r: Specialist) => (
        <Space>
          <Avatar src={r.image_url} icon={<UserOutlined />} />
          <span>
            <strong>
              {r.title} {r.name}
            </strong>
          </span>
        </Space>
      ),
    },
    {
      title: "Specialisation",
      dataIndex: "specialisation_id",
      render: (v: number) => <Tag color="blue">{getSpecialisationName(v)}</Tag>,
    },
    { title: "Appointment Email", dataIndex: "appointment_email" },
    {
      title: "Availability",
      dataIndex: "day_availability",
      render: (v: Record<string, string[]>) =>
        v && Object.keys(v).length > 0
          ? Object.entries(v).map(([day, slots]) => (
              <Tag key={day}>{day.slice(0, 3)}: {slots.join("/")}</Tag>
            ))
          : "-",
    },
    {
      title: "Active",
      dataIndex: "active",
      render: (v: boolean, record: Specialist) => (
        <Switch checked={v} onChange={() => toggleActive(record)} />
      ),
    },
    {
      title: "Actions",
      render: (_: any, record: Specialist) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this specialist?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              Delete
            </Button>
          </Popconfirm>
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
            Specialists
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Specialist
          </Button>
        </div>

        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={specialists}
          columns={columns}
        />

        <Modal
          title={editing ? "Edit Specialist" : "Add Specialist"}
          open={modalOpen}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
            form.resetFields();
            setImageFile([]);
            setClinicPhotoFile([]);
          }}
          onOk={() => form.submit()}
          confirmLoading={saveMutation.isPending}
          width={800}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={(v) => saveMutation.mutate(v)}
          >
            <div className="grid grid-cols-2 gap-x-4">
              <Form.Item
                name="category_id"
                label="Specialisation"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select specialisation">
                  {specialisations.map((s) => (
                    <Option key={s.id} value={s.id}>
                      {s.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="title" label="Title">
                <Select placeholder="Dr / Prof / Assoc Prof">
                  <Option value="Dr">Dr</Option>
                  <Option value="Prof">Prof</Option>
                  <Option value="Assoc Prof">Assoc Prof</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="name"
                label="Full Name"
                rules={[{ required: true }]}
                className="col-span-2"
              >
                <Input placeholder="e.g. James Tan Wei Ming" />
              </Form.Item>
              <Form.Item label="Photo Image" className="col-span-2">
                <Upload
                  listType="picture-card"
                  fileList={imageFile}
                  maxCount={1}
                  beforeUpload={() => false}
                  onChange={({ fileList }) => setImageFile(fileList)}
                >
                  {imageFile.length === 0 && (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Upload Photo</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
              <Form.Item
                name="credentials"
                label="Credentials"
                className="col-span-2"
              >
                <Input placeholder="e.g. MBBS (NUS), MRCP (UK), FAMS (Cardiology)" />
              </Form.Item>
              <Form.Item
                name="short_bio"
                label="Short Bio (card view)"
                className="col-span-2"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="2-3 sentence summary shown on the card"
                />
              </Form.Item>
              <Form.Item
                name="full_bio"
                label="Full Bio (profile page)"
                className="col-span-2"
              >
                <Input.TextArea rows={4} placeholder="Full profile biography" />
              </Form.Item>
              <Form.Item name="languages" label="Languages">
                <Input placeholder="e.g. English,Mandarin,Malay" />
              </Form.Item>
              <Form.Item
                name="appointment_email"
                label="Email (optional)"
                rules={[{ type: "email" }]}
              >
                <Input placeholder="dr.name@clinic.com" />
              </Form.Item>
              <Form.Item
                name="contact_phone"
                label="Contact Phone (shown on profile)"
              >
                <Input placeholder="+65 6123 4567" />
              </Form.Item>
              <Form.Item
                name="clinic_name"
                label="Clinic Name"
                rules={[{ required: true }]}
              >
                <Input placeholder="e.g. Pinnacle Clinic" />
              </Form.Item>
              <Form.Item
                name="consultation_fee"
                label="Consultation Fee"
              >
                <Input placeholder="e.g. $80 - $150 or From $100" />
              </Form.Item>
              <Form.Item
                name="years_of_practice"
                label="Years of Practice"
              >
                <InputNumber min={0} placeholder="e.g. 15" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="Clinic Photo" className="col-span-2">
                <Upload
                  listType="picture-card"
                  fileList={clinicPhotoFile}
                  maxCount={1}
                  beforeUpload={() => false}
                  onChange={({ fileList }) => setClinicPhotoFile(fileList)}
                >
                  {clinicPhotoFile.length === 0 && (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Upload Clinic Photo</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <Form.Item
                name="hospital_affiliations"
                label="Hospital Affiliations"
                className="col-span-2"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="e.g. Singapore General Hospital, NUH"
                />
              </Form.Item>
              <Form.Item
                name="board_certifications"
                label="Board Certifications"
                className="col-span-2"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="e.g. Board Certified in Cardiology"
                />
              </Form.Item>
              <Form.Item
                name="awards"
                label="Awards & Achievements"
                className="col-span-2"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="e.g. Best Doctor 2025, Healthcare Excellence Award"
                />
              </Form.Item>
              <Form.Item
                name="insurance_tpa"
                label="Insurance (TPA) Providers"
                className="col-span-2"
              >
                <Input placeholder="e.g. FastHealth, AXA, CHUA" />
              </Form.Item>
              <Form.Item
                name="insurance_shield_plan"
                label="Insurance (Shield Plan) Providers"
                className="col-span-2"
              >
                <Input placeholder="e.g. Shield Plan A, Shield Plan B" />
              </Form.Item>
              <Form.Item
                label="Availability (per day)"
                className="col-span-2"
              >
                <Form.Item name="day_availability" noStyle initialValue={{}}>
                  <DayAvailabilityPicker />
                </Form.Item>
              </Form.Item>
              <Form.Item
                name="display_order"
                label="Display Order"
                initialValue={0}
              >
                <InputNumber min={0} />
              </Form.Item>
              <Form.Item
                name="active"
                label="Active"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </div>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};
