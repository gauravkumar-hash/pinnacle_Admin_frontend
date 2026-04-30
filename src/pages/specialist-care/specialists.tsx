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

export const SpecialistsScreen = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Specialist | null>(null);
  const [form] = Form.useForm();
  const [imageFile, setImageFile] = useState<UploadFile[]>([]);
  const [clinicPhotoFile, setClinicPhotoFile] = useState<UploadFile[]>([]);
  const [bannerImageFile, setBannerImageFile] = useState<UploadFile[]>([]);

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
      formData.append("consultation_fee", values.consultation_fee?.toString() || "");

      // Add optional fields
      formData.append("title", values.title || "");
      formData.append("credentials", values.credentials || "");
      formData.append("short_bio", values.short_bio || "");
      formData.append("full_bio", values.full_bio || "");
      formData.append("languages", values.languages || "");
      formData.append("contact_email", values.contact_email || "");
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

      formData.append("display_order", values.display_order?.toString() || "0");
      formData.append("active", values.active ? "true" : "false");

      // Add image files if selected
      if (imageFile.length > 0 && imageFile[0].originFileObj) {
        formData.append("image", imageFile[0].originFileObj);
      }
      if (clinicPhotoFile.length > 0 && clinicPhotoFile[0].originFileObj) {
        formData.append("clinic_photo", clinicPhotoFile[0].originFileObj);
      }
      if (bannerImageFile.length > 0 && bannerImageFile[0].originFileObj) {
        formData.append("banner_image", bannerImageFile[0].originFileObj);
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
      setBannerImageFile([]);
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
      // Map backend ID back to form field name
      category_id: record.specialisation_id,
      available_days: record.available_days
        ? record.available_days.split(",")
        : [],
      available_time_slots: (record as any).available_time_slots
        ? (record as any).available_time_slots.split(",")
        : [],
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
    if (record.banner_image_path) {
      setBannerImageFile([
        { uid: "-3", name: "banner_image", status: "done", url: record.banner_image_path },
      ]);
    } else {
      setBannerImageFile([]);
    }

    setModalOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setImageFile([]);
    setClinicPhotoFile([]);
    setBannerImageFile([]);
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
      title: "Available Days",
      dataIndex: "available_days",
      render: (v: string) =>
        v ? v.split(",").map((d) => <Tag key={d}>{d.slice(0, 3)}</Tag>) : "-",
    },
    {
      title: "Time Slots",
      dataIndex: "available_time_slots",
      render: (v: string) =>
        v ? v.split(",").map((slot) => <Tag key={slot}>{slot}</Tag>) : "-",
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
            setBannerImageFile([]);
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
                label="Appointment Email (receives requests)"
                rules={[{ required: true, type: "email" }]}
              >
                <Input placeholder="dr.name@clinic.com" />
              </Form.Item>
              <Form.Item
                name="contact_email"
                label="Contact Email (shown on profile)"
              >
                <Input placeholder="dept@clinic.com" />
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
                label="Consultation Fee (SGD)"
                rules={[{ required: true, type: "number", min: 0 }]}
              >
                <InputNumber step={0.01} placeholder="e.g. 150.00" style={{ width: "100%" }} />
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
              <Form.Item label="Banner Image" className="col-span-2">
                <Upload
                  listType="picture-card"
                  fileList={bannerImageFile}
                  maxCount={1}
                  beforeUpload={() => false}
                  onChange={({ fileList }) => setBannerImageFile(fileList)}
                >
                  {bannerImageFile.length === 0 && (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Upload Banner Image</div>
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
                name="available_days"
                label="Available Days"
                className="col-span-2"
              >
                <Select mode="multiple" placeholder="Select available days">
                  {DAYS.map((d) => (
                    <Option key={d} value={d}>
                      {d}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="available_time_slots"
                label="Available Time Slots"
                className="col-span-2"
              >
                <Select mode="multiple" placeholder="Select time slots">
                  <Option value="morning">Morning</Option>
                  <Option value="afternoon">Afternoon</Option>
                </Select>
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
