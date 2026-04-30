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
  ShoppingOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthProvider";
import { getSpecialisations } from "../../apis/specialist-care";
import {
  getServices,
  createService,
  updateService,
  deleteService,
  Service,
} from "../../apis/services";

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

export const ServicesScreen = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form] = Form.useForm();
  const [clinicPhotoFile, setClinicPhotoFile] = useState<UploadFile[]>([]);
  const [bannerImageFile, setBannerImageFile] = useState<UploadFile[]>([]);

  const onError = (status: number, msg: string) =>
    messageApi.error(`Error ${status}: ${msg}`);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => getServices(session!, onError),
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

      // Add required fields
      formData.append("specialisation_id", values.specialisation_id?.toString() || "");
      formData.append("service_name", values.service_name || "");
      formData.append("clinic_name", values.clinic_name || "");
      formData.append("consultation_fee", values.consultation_fee?.toString() || "");

      // Add optional fields
      formData.append("bio", values.bio || "");
      formData.append("service_details", values.service_details || "");
      formData.append("languages", values.languages || "");
      formData.append("years_of_practice", values.years_of_practice?.toString() || "");
      formData.append("hospital_affiliations", values.hospital_affiliations || "");
      formData.append("board_certifications", values.board_certifications || "");
      formData.append("awards", values.awards || "");
      formData.append("insurance_tpa", values.insurance_tpa || "");
      formData.append("insurance_shield_plan", values.insurance_shield_plan || "");
      formData.append("contact_name", values.contact_name || "");
      formData.append("contact_email", values.contact_email || "");
      formData.append("contact_phone", values.contact_phone || "");
      formData.append("display_order", values.display_order?.toString() || "0");

      formData.append("active", values.active ? "true" : "false");

      // Add image files if selected
      if (clinicPhotoFile.length > 0 && clinicPhotoFile[0].originFileObj) {
        formData.append("clinic_photo", clinicPhotoFile[0].originFileObj);
      }
      if (bannerImageFile.length > 0 && bannerImageFile[0].originFileObj) {
        formData.append("banner_image", bannerImageFile[0].originFileObj);
      }

      if (editing)
        return updateService(session!, editing.id, formData, onError);
      return createService(session!, formData, onError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      messageApi.success(editing ? "Service updated" : "Service created");
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      setClinicPhotoFile([]);
      setBannerImageFile([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteService(session!, id, onError),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      messageApi.success("Service deleted");
    },
  });

  const toggleActive = (record: Service) => {
    updateService(
      session!,
      record.id,
      { active: !record.active },
      onError,
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    });
  };

  const openEdit = (record: Service) => {
    setEditing(record);
    form.setFieldsValue(record);

    // Set existing images
    if (record.clinic_photo_path) {
      setClinicPhotoFile([
        { uid: "-1", name: "clinic_photo", status: "done", url: record.clinic_photo_path },
      ]);
    } else {
      setClinicPhotoFile([]);
    }
    if (record.banner_image_path) {
      setBannerImageFile([
        { uid: "-2", name: "banner_image", status: "done", url: record.banner_image_path },
      ]);
    } else {
      setBannerImageFile([]);
    }

    setModalOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setClinicPhotoFile([]);
    setBannerImageFile([]);
    setModalOpen(true);
  };

  const getSpecialisationName = (id: number) =>
    specialisations.find((s) => s.id === id)?.name ?? "-";

  const columns = [
    {
      title: "Service Name",
      dataIndex: "service_name",
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: "Specialisation",
      dataIndex: "specialisation_id",
      render: (v: number) => <Tag color="blue">{getSpecialisationName(v)}</Tag>,
    },
    { title: "Clinic", dataIndex: "clinic_name" },
    {
      title: "Consultation Fee",
      dataIndex: "consultation_fee",
      render: (v: number) => `$${v.toFixed(2)}`,
    },
    {
      title: "Active",
      dataIndex: "active",
      render: (v: boolean, record: Service) => (
        <Switch checked={v} onChange={() => toggleActive(record)} />
      ),
    },
    {
      title: "Order",
      dataIndex: "display_order",
      sorter: (a: Service, b: Service) => (a.display_order || 0) - (b.display_order || 0),
    },
    {
      title: "Actions",
      render: (_: any, record: Service) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this service?"
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
            Services
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Service
          </Button>
        </div>

        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={services}
          columns={columns}
          pagination={{ pageSize: 10 }}
        />

        <Modal
          title={editing ? "Edit Service" : "Add Service"}
          open={modalOpen}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
            form.resetFields();
            setClinicPhotoFile([]);
            setBannerImageFile([]);
          }}
          onOk={() => form.submit()}
          confirmLoading={saveMutation.isPending}
          width={700}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={(v) => saveMutation.mutate(v)}
          >
            <div className="grid grid-cols-2 gap-x-4">
              <Form.Item
                name="specialisation_id"
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
              <Form.Item
                name="service_name"
                label="Service Name"
                rules={[{ required: true }]}
              >
                <Input placeholder="e.g. Scaling and Polishing" />
              </Form.Item>
              <Form.Item
                name="clinic_name"
                label="Clinic Name"
                rules={[{ required: true }]}
                className="col-span-2"
              >
                <Input placeholder="e.g. Teeth Org" />
              </Form.Item>
              <Form.Item
                name="consultation_fee"
                label="Consultation Fee (SGD)"
                rules={[{ required: true, type: "number", min: 0 }]}
              >
                <InputNumber step={0.01} placeholder="e.g. 100.00" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="years_of_practice"
                label="Years of Practice"
              >
                <InputNumber min={0} placeholder="e.g. 15" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="display_order"
                label="Display Order"
                initialValue={0}
              >
                <InputNumber min={0} placeholder="Smallest shows first" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="bio"
                label="Service Bio/Description"
                className="col-span-2"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Professional service description"
                />
              </Form.Item>
              <Form.Item
                name="service_details"
                label="Service Details"
                className="col-span-2"
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Detailed information about the service"
                />
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
              <Form.Item name="languages" label="Languages">
                <Input placeholder="e.g. English, Mandarin, Malay" />
              </Form.Item>
              <Form.Item
                name="hospital_affiliations"
                label="Hospital Affiliations"
              >
                <Input placeholder="e.g. Singapore General Hospital" />
              </Form.Item>
              <Form.Item
                name="board_certifications"
                label="Board Certifications"
                className="col-span-2"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="e.g. Board Certified services"
                />
              </Form.Item>
              <Form.Item
                name="awards"
                label="Awards & Recognition"
                className="col-span-2"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="e.g. Service Excellence Award"
                />
              </Form.Item>
              <Form.Item
                name="insurance_tpa"
                label="Insurance (TPA) Providers"
                className="col-span-2"
              >
                <Input placeholder="e.g. FastHealth, AXA" />
              </Form.Item>
              <Form.Item
                name="insurance_shield_plan"
                label="Insurance (Shield Plan) Providers"
                className="col-span-2"
              >
                <Input placeholder="e.g. Shield Plan A, Shield Plan B" />
              </Form.Item>
              <Form.Item
                name="contact_name"
                label="Contact Person Name"
              >
                <Input placeholder="e.g. John Tan" />
              </Form.Item>
              <Form.Item
                name="contact_email"
                label="Contact Email"
                rules={[{ type: "email" }]}
              >
                <Input placeholder="contact@clinic.com" />
              </Form.Item>
              <Form.Item
                name="contact_phone"
                label="Contact Phone"
              >
                <Input placeholder="+65 6123 4567" />
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
