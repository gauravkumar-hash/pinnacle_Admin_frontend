import { useState } from 'react';
import { Layout, Typography, Button, Table, Switch, Space, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Tag, Avatar, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, UploadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthProvider';
import { getSpecialisations, getSpecialists, createSpecialist, updateSpecialist, deleteSpecialist, Specialist } from '../../apis/specialist-care';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const SpecialistsScreen = () => {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const [messageApi, contextHolder] = message.useMessage();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Specialist | null>(null);
    const [form] = Form.useForm();

    const onError = (status: number, msg: string) => messageApi.error(`Error ${status}: ${msg}`);

    const { data: specialists = [], isLoading } = useQuery({
        queryKey: ['specialists'],
        queryFn: () => getSpecialists(session!, onError),
        enabled: !!session,
    });

    const { data: specialisations = [] } = useQuery({
        queryKey: ['specialisations'],
        queryFn: () => getSpecialisations(session!, onError),
        enabled: !!session,
    });

const saveMutation = useMutation({
    mutationFn: async (values: any) => {
        // Map the data to match the Backend contract
        const payload = {
            ...values,
            // 1. Rename category_id to specialisation_id
            specialisation_id: values.category_id, 
            
            // 2. Ensure available_days is a string
            available_days: Array.isArray(values.available_days)
                ? values.available_days.join(',')
                : values.available_days,

            // 3. Ensure optional strings are at least empty strings (prevents 422)
            full_bio: values.full_bio || "",
            short_bio: values.short_bio || "",
            image_url: values.image_url || "",
        };

        // Remove the key the backend doesn't recognize
        delete payload.category_id;

        if (editing) return updateSpecialist(session!, editing.id, payload, onError);
        return createSpecialist(session!, payload, onError);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['specialists'] });
        messageApi.success(editing ? 'Specialist updated' : 'Specialist created');
        setModalOpen(false);
        form.resetFields();
        setEditing(null);
    },
});

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteSpecialist(session!, id, onError),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['specialists'] });
            messageApi.success('Specialist deleted');
        },
    });

    const toggleActive = (record: Specialist) => {
        updateSpecialist(session!, record.id, { active: !record.active }, onError).then(() => {
            queryClient.invalidateQueries({ queryKey: ['specialists'] });
        });
    };

const openEdit = (record: Specialist) => {
    setEditing(record);
    form.setFieldsValue({
        ...record,
        // Map backend ID back to form field name
        category_id: record.specialisation_id, 
        available_days: record.available_days ? record.available_days.split(',') : [],
    });
    setModalOpen(true);
};

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        setModalOpen(true);
    };

    const getSpecialisationName = (id: number) =>
        specialisations.find((s) => s.id === id)?.name ?? '-';

    const columns = [
        { title: 'Order', dataIndex: 'display_order', width: 70 },
        {
            title: 'Doctor',
            render: (_: any, r: Specialist) => (
                <Space>
                    <Avatar src={r.image_url} icon={<UserOutlined />} />
                    <span><strong>{r.title} {r.name}</strong></span>
                </Space>
            ),
        },
        {
            title: 'Specialisation',
            dataIndex: 'specialisation_id',
            render: (v: number) => <Tag color="blue">{getSpecialisationName(v)}</Tag>,
        },
        { title: 'Appointment Email', dataIndex: 'appointment_email' },
        {
            title: 'Available Days',
            dataIndex: 'available_days',
            render: (v: string) => v ? v.split(',').map((d) => <Tag key={d}>{d.slice(0, 3)}</Tag>) : '-',
        },
        {
            title: 'Active',
            dataIndex: 'active',
            render: (v: boolean, record: Specialist) => (
                <Switch checked={v} onChange={() => toggleActive(record)} />
            ),
        },
        {
            title: 'Actions',
            render: (_: any, record: Specialist) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Edit</Button>
                    <Popconfirm title="Delete this specialist?" onConfirm={() => deleteMutation.mutate(record.id)}>
                        <Button icon={<DeleteOutlined />} size="small" danger>Delete</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Layout style={{ padding: '24px', background: '#fff', flex: 1 }}>
            {contextHolder}
            <Content>
                <div className="flex justify-between items-center mb-4">
                    <Title level={4} style={{ margin: 0 }}>Specialists</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Specialist</Button>
                </div>

                <Table rowKey="id" loading={isLoading} dataSource={specialists} columns={columns} />

                <Modal
                    title={editing ? 'Edit Specialist' : 'Add Specialist'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
                    onOk={() => form.submit()}
                    confirmLoading={saveMutation.isPending}
                    width={700}
                >
                    <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
                        <div className="grid grid-cols-2 gap-x-4">
                            <Form.Item name="category_id" label="Specialisation" rules={[{ required: true }]}>
                                <Select placeholder="Select specialisation">
                                    {specialisations.map((s) => (
                                        <Option key={s.id} value={s.id}>{s.name}</Option>
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
                            <Form.Item name="name" label="Full Name" rules={[{ required: true }]} className="col-span-2">
                                <Input placeholder="e.g. James Tan Wei Ming" />
                            </Form.Item>
                            <Form.Item name="image_url" label="Photo URL" className="col-span-2">
                                <Input placeholder="https://... (paste URL after uploading to storage)" />
                            </Form.Item>
                            <Form.Item name="credentials" label="Credentials" className="col-span-2">
                                <Input placeholder="e.g. MBBS (NUS), MRCP (UK), FAMS (Cardiology)" />
                            </Form.Item>
                            <Form.Item name="short_bio" label="Short Bio (card view)" className="col-span-2">
                                <Input.TextArea rows={2} placeholder="2-3 sentence summary shown on the card" />
                            </Form.Item>
                            <Form.Item name="full_bio" label="Full Bio (profile page)" className="col-span-2">
                                <Input.TextArea rows={4} placeholder="Full profile biography" />
                            </Form.Item>
                            <Form.Item name="languages" label="Languages">
                                <Input placeholder="e.g. English,Mandarin,Malay" />
                            </Form.Item>
                            <Form.Item name="appointment_email" label="Appointment Email (receives requests)" rules={[{ required: true, type: 'email' }]}>
                                <Input placeholder="dr.name@clinic.com" />
                            </Form.Item>
                            <Form.Item name="contact_email" label="Contact Email (shown on profile)">
                                <Input placeholder="dept@clinic.com" />
                            </Form.Item>
                            <Form.Item name="contact_phone" label="Contact Phone (shown on profile)">
                                <Input placeholder="+65 6123 4567" />
                            </Form.Item>
                            <Form.Item name="available_days" label="Available Days" className="col-span-2">
                                <Select mode="multiple" placeholder="Select available days">
                                    {DAYS.map((d) => <Option key={d} value={d}>{d}</Option>)}
                                </Select>
                            </Form.Item>
                            <Form.Item name="display_order" label="Display Order" initialValue={0}>
                                <InputNumber min={0} />
                            </Form.Item>
                            <Form.Item name="active" label="Active" valuePropName="checked" initialValue={true}>
                                <Switch />
                            </Form.Item>
                        </div>
                    </Form>
                </Modal>
            </Content>
        </Layout>
    );
};
