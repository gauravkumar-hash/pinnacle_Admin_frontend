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
  message,
  Popconfirm,
  Tag,
  Upload,
  Image,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthProvider";
import {
  getSpecialisations,
  createSpecialisation,
  updateSpecialisation,
  deleteSpecialisation,
  Specialisation,
} from "../../apis/specialist-care";

const { Content } = Layout;
const { Title } = Typography;

export const SpecialisationsScreen = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Specialisation | null>(null);
  const [form] = Form.useForm();
  const [iconFile, setIconFile] = useState<UploadFile[]>([]);
  const [bannerFile, setBannerFile] = useState<UploadFile[]>([]);

  const onError = (status: number, msg: string) =>
    messageApi.error(`Error ${status}: ${msg}`);

  const { data: specialisations = [], isLoading } = useQuery({
    queryKey: ["specialisations"],
    queryFn: () => getSpecialisations(session!, onError),
    enabled: !!session,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: Partial<Specialisation>) => {
      const formData = new FormData();

      // Add required fields
      formData.append("name", values.name || "");
      formData.append("slug", values.slug || "");

      // Add optional fields
      formData.append("description", values.description || "");
      formData.append("display_order", values.display_order?.toString() || "0");
      formData.append("active", values.active ? "true" : "false");

      if (iconFile.length > 0 && iconFile[0].originFileObj) {
        formData.append("icon", iconFile[0].originFileObj);
      }
      if (bannerFile.length > 0 && bannerFile[0].originFileObj) {
        formData.append("banner", bannerFile[0].originFileObj);
      }

      if (editing)
        return updateSpecialisation(session!, editing.id, formData, onError);
      return createSpecialisation(session!, formData, onError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialisations"] });
      messageApi.success(
        editing ? "Specialisation updated" : "Specialisation created",
      );
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      setIconFile([]);
      setBannerFile([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSpecialisation(session!, id, onError),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialisations"] });
      messageApi.success("Specialisation deleted");
    },
  });

  const toggleActive = (record: Specialisation) => {
    updateSpecialisation(
      session!,
      record.id,
      { active: !record.active },
      onError,
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ["specialisations"] });
    });
  };

  const openEdit = (record: Specialisation) => {
    setEditing(record);
    form.setFieldsValue(record);

    // Set existing images
    if (record.icon_url) {
      setIconFile([
        { uid: "-1", name: "icon", status: "done", url: record.icon_url },
      ]);
    } else {
      setIconFile([]);
    }
    if (record.banner_url) {
      setBannerFile([
        { uid: "-2", name: "banner", status: "done", url: record.banner_url },
      ]);
    } else {
      setBannerFile([]);
    }

    setModalOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setIconFile([]);
    setBannerFile([]);
    setModalOpen(true);
  };

  const columns = [
    { title: "Order", dataIndex: "display_order", width: 80 },
    {
      title: "Icon",
      dataIndex: "icon_url",
      width: 80,
      render: (url: string) =>
        url ? (
          <Image
            src={url}
            width={40}
            height={40}
            style={{ objectFit: "cover" }}
          />
        ) : (
          "-"
        ),
    },
    {
      title: "Name",
      dataIndex: "name",
      render: (v: string) => <strong>{v}</strong>,
    },
    { title: "Slug", dataIndex: "slug", render: (v: string) => <Tag>{v}</Tag> },
    { title: "Description", dataIndex: "description", ellipsis: true },
    {
      title: "Active",
      dataIndex: "active",
      render: (v: boolean, record: Specialisation) => (
        <Switch checked={v} onChange={() => toggleActive(record)} />
      ),
    },
    {
      title: "Actions",
      render: (_: any, record: Specialisation) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this specialisation?"
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
            Specialisations
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Specialisation
          </Button>
        </div>

        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={specialisations}
          columns={columns}
          pagination={false}
        />

        <Modal
          title={editing ? "Edit Specialisation" : "Add Specialisation"}
          open={modalOpen}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
            form.resetFields();
            setIconFile([]);
            setBannerFile([]);
          }}
          onOk={() => form.submit()}
          confirmLoading={saveMutation.isPending}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={(v) => saveMutation.mutate(v)}
          >
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. Cardiology" />
            </Form.Item>
            <Form.Item name="slug" label="Slug" rules={[{ required: true }]}>
              <Input placeholder="e.g. cardiology" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item label="Icon Image">
              <Upload
                listType="picture-card"
                fileList={iconFile}
                maxCount={1}
                beforeUpload={() => false}
                onChange={({ fileList }) => setIconFile(fileList)}
              >
                {iconFile.length === 0 && (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>Upload Icon</div>
                  </div>
                )}
              </Upload>
            </Form.Item>

            {/* Banner upload hidden from UI but logic preserved */}
            <Form.Item label="Banner Image" style={{ display: "none" }}>
              <Upload
                listType="picture-card"
                fileList={bannerFile}
                maxCount={1}
                beforeUpload={() => false}
                onChange={({ fileList }) => setBannerFile(fileList)}
              >
                {bannerFile.length === 0 && (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>Upload Banner</div>
                  </div>
                )}
              </Upload>
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
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};
