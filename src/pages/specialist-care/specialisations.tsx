import { useState } from 'react';
import { Layout, Typography, Button, Table, Switch, Space, Modal, Form, Input, InputNumber, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthProvider';
import { getSpecialisations, createSpecialisation, updateSpecialisation, deleteSpecialisation, Specialisation } from '../../apis/specialist-care';

const { Content } = Layout;
const { Title } = Typography;

export const SpecialisationsScreen = () => {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const [messageApi, contextHolder] = message.useMessage();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Specialisation | null>(null);
    const [form] = Form.useForm();

    const onError = (status: number, msg: string) => messageApi.error(`Error ${status}: ${msg}`);

    const { data: specialisations = [], isLoading } = useQuery({
        queryKey: ['specialisations'],
        queryFn: () => getSpecialisations(session!, onError),
        enabled: !!session,
    });

    const saveMutation = useMutation({
        mutationFn: async (values: Partial<Specialisation>) => {
            if (editing) return updateSpecialisation(session!, editing.id, values, onError);
            return createSpecialisation(session!, values, onError);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['specialisations'] });
            messageApi.success(editing ? 'Specialisation updated' : 'Specialisation created');
            setModalOpen(false);
            form.resetFields();
            setEditing(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteSpecialisation(session!, id, onError),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['specialisations'] });
            messageApi.success('Specialisation deleted');
        },
    });

    const toggleActive = (record: Specialisation) => {
        updateSpecialisation(session!, record.id, { active: !record.active }, onError).then(() => {
            queryClient.invalidateQueries({ queryKey: ['specialisations'] });
        });
    };

    const openEdit = (record: Specialisation) => {
        setEditing(record);
        form.setFieldsValue(record);
        setModalOpen(true);
    };

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        setModalOpen(true);
    };

    const columns = [
        { title: 'Order', dataIndex: 'display_order', width: 80 },
        { title: 'Name', dataIndex: 'name', render: (v: string) => <strong>{v}</strong> },
        { title: 'Slug', dataIndex: 'slug', render: (v: string) => <Tag>{v}</Tag> },
        { title: 'Description', dataIndex: 'description', ellipsis: true },
        {
            title: 'Active',
            dataIndex: 'active',
            render: (v: boolean, record: Specialisation) => (
                <Switch checked={v} onChange={() => toggleActive(record)} />
            ),
        },
        {
            title: 'Actions',
            render: (_: any, record: Specialisation) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Edit</Button>
                    <Popconfirm title="Delete this specialisation?" onConfirm={() => deleteMutation.mutate(record.id)}>
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
                    <Title level={4} style={{ margin: 0 }}>Specialisations</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Specialisation</Button>
                </div>

                <Table
                    rowKey="id"
                    loading={isLoading}
                    dataSource={specialisations}
                    columns={columns}
                    pagination={false}
                />

                <Modal
                    title={editing ? 'Edit Specialisation' : 'Add Specialisation'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
                    onOk={() => form.submit()}
                    confirmLoading={saveMutation.isPending}
                >
                    <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
                        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                            <Input placeholder="e.g. Cardiology" />
                        </Form.Item>
                        <Form.Item name="slug" label="Slug" rules={[{ required: true }]}>
                            <Input placeholder="e.g. cardiology" />
                        </Form.Item>
                        <Form.Item name="description" label="Description">
                            <Input.TextArea rows={3} />
                        </Form.Item>
                        <Form.Item name="icon_url" label="Icon URL">
                            <Input placeholder="https://..." />
                        </Form.Item>
                        <Form.Item name="banner_url" label="Banner URL">
                            <Input placeholder="https://..." />
                        </Form.Item>
                        <Form.Item name="display_order" label="Display Order" initialValue={0}>
                            <InputNumber min={0} />
                        </Form.Item>
                        <Form.Item name="active" label="Active" valuePropName="checked" initialValue={true}>
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>
            </Content>
        </Layout>
    );
};
