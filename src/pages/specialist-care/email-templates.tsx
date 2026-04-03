import { useState } from 'react';
import {
    Layout, Typography, Card, Button, Form, Input, Modal, Space,
    Tabs, Tag, Tooltip, Divider, Alert, message, Spin, Empty,
} from 'antd';
import {
    EditOutlined, EyeOutlined, InfoCircleOutlined, SyncOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthProvider';
import { EmailTemplate, getEmailTemplates, seedEmailTemplates, updateEmailTemplate } from '@/apis/email-templates';


const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ── Placeholder chips shown as a reference panel ───────────────────────────────

const PLACEHOLDERS: Record<string, string[]> = {
    specialist_notification: [
        '{{clinic_name}}', '{{patient_name}}', '{{patient_dob}}',
        '{{contact_number}}', '{{email}}', '{{preferred_days}}',
        '{{preferred_time}}', '{{reason}}',
    ],
    patient_confirmation: [
        '{{clinic_name}}', '{{patient_name}}', '{{specialist_title}}',
        '{{specialist_name}}', '{{contact_number}}',
    ],
};

// ── Sub-component: live HTML preview ──────────────────────────────────────────

function HtmlPreview({ html }: { html: string }) {
    return (
        <div
            style={{
                border: '1px solid #d9d9d9',
                borderRadius: 6,
                padding: 16,
                background: '#fff',
                minHeight: 200,
                maxHeight: 420,
                overflowY: 'auto',
            }}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditTemplateModal({
    template,
    onClose,
}: {
    template: EmailTemplate;
    onClose: () => void;
}) {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const [messageApi, contextHolder] = message.useMessage();
    const [form] = Form.useForm();
    const [previewHtml, setPreviewHtml] = useState(template.body_html);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

    const mutation = useMutation({
        mutationFn: (values: Partial<EmailTemplate>) =>
            updateEmailTemplate(session!, template.template_key, values, (s, m) =>
                messageApi.error(`Error ${s}: ${m}`)
            ),
        onSuccess: (updated) => {
            if (updated) {
                queryClient.invalidateQueries({ queryKey: ['email-templates'] });
                messageApi.success('Template saved!');
                onClose();
            }
        },
    });

    const placeholders = PLACEHOLDERS[template.template_key] ?? [];

    return (
        <Modal
            open
            title={
                <Space>
                    <EditOutlined />
                    <span>Edit Template — {template.label}</span>
                </Space>
            }
            onCancel={onClose}
            onOk={() => form.submit()}
            confirmLoading={mutation.isPending}
            width={860}
            styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
        >
            {contextHolder}

            {/* Placeholder reference */}
            {placeholders.length > 0 && (
                <Alert
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    style={{ marginBottom: 16 }}
                    message="Available placeholders"
                    description={
                        <Space wrap size={4} style={{ marginTop: 4 }}>
                            {placeholders.map((p) => (
                                <Tag
                                    key={p}
                                    color="blue"
                                    style={{ cursor: 'pointer', fontFamily: 'monospace' }}
                                    onClick={() => {
                                        navigator.clipboard.writeText(p);
                                        messageApi.success(`Copied ${p}`);
                                    }}
                                >
                                    {p}
                                </Tag>
                            ))}
                        </Space>
                    }
                />
            )}

            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    label: template.label,
                    subject: template.subject,
                    body_html: template.body_html,
                    body_text: template.body_text,
                    description: template.description,
                }}
                onFinish={(values) => mutation.mutate(values)}
            >
                <Form.Item name="label" label="Template Label" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>

                <Form.Item name="subject" label="Email Subject" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>

                {/* HTML editor + preview tabs */}
                <Form.Item
                    label={
                        <Space>
                            HTML Body
                            <Tooltip title="Supports {{placeholder}} variables — click a chip above to copy">
                                <InfoCircleOutlined style={{ color: '#aaa' }} />
                            </Tooltip>
                        </Space>
                    }
                >
                    <Tabs
                        activeKey={activeTab}
                        onChange={(k) => setActiveTab(k as 'edit' | 'preview')}
                        size="small"
                        items={[
                            {
                                key: 'edit',
                                label: (
                                    <Space size={4}>
                                        <EditOutlined /> Edit
                                    </Space>
                                ),
                                children: (
                                    <Form.Item name="body_html" noStyle rules={[{ required: true }]}>
                                        <TextArea
                                            rows={12}
                                            style={{ fontFamily: 'monospace', fontSize: 12 }}
                                            onChange={(e) => setPreviewHtml(e.target.value)}
                                        />
                                    </Form.Item>
                                ),
                            },
                            {
                                key: 'preview',
                                label: (
                                    <Space size={4}>
                                        <EyeOutlined /> Preview
                                    </Space>
                                ),
                                children: <HtmlPreview html={previewHtml} />,
                            },
                        ]}
                    />
                </Form.Item>

                <Form.Item name="body_text" label="Plain-text fallback" rules={[{ required: true }]}>
                    <TextArea rows={4} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                </Form.Item>

                <Form.Item name="description" label="Admin notes / description">
                    <TextArea rows={2} placeholder="Internal notes about this template" />
                </Form.Item>
            </Form>
        </Modal>
    );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export const EmailTemplatesScreen = () => {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const [messageApi, contextHolder] = message.useMessage();
    const [editing, setEditing] = useState<EmailTemplate | null>(null);

    const onError = (status: number, msg: string) =>
        messageApi.error(`Error ${status}: ${msg}`);

    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['email-templates'],
        queryFn: () => getEmailTemplates(session!, onError),
        enabled: !!session,
    });

    const seedMutation = useMutation({
        mutationFn: () => seedEmailTemplates(session!, onError),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['email-templates'] });
            if (result?.seeded.length) {
                messageApi.success(`Seeded: ${result.seeded.join(', ')}`);
            } else {
                messageApi.info('All default templates already exist.');
            }
        },
    });

    return (
        <Layout style={{ padding: '24px', background: '#fff', flex: 1 }}>
            {contextHolder}
            <Content>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Email Templates</Title>
                        <Text type="secondary">
                            Edit the emails sent to patients and specialists when appointments are requested.
                        </Text>
                    </div>
                    <Tooltip title="Insert the default templates if they're missing">
                        <Button
                            icon={<SyncOutlined />}
                            loading={seedMutation.isPending}
                            onClick={() => seedMutation.mutate()}
                        >
                            Seed Defaults
                        </Button>
                    </Tooltip>
                </div>

                <Divider style={{ marginTop: 8 }} />

                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Spin size="large" />
                    </div>
                ) : templates.length === 0 ? (
                    <Empty
                        description="No email templates found."
                        style={{ marginTop: 64 }}
                    >
                        <Button type="primary" onClick={() => seedMutation.mutate()}>
                            Seed Default Templates
                        </Button>
                    </Empty>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {templates.map((tpl) => (
                            <Card
                                key={tpl.template_key}
                                size="small"
                                title={
                                    <Space>
                                        <Tag color="geekblue" style={{ fontFamily: 'monospace' }}>
                                            {tpl.template_key}
                                        </Tag>
                                        <strong>{tpl.label}</strong>
                                    </Space>
                                }
                                extra={
                                    <Button
                                        icon={<EditOutlined />}
                                        type="primary"
                                        size="small"
                                        onClick={() => setEditing(tpl)}
                                    >
                                        Edit
                                    </Button>
                                }
                            >
                                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                    <div>
                                        <Text type="secondary">Subject: </Text>
                                        <Text code>{tpl.subject}</Text>
                                    </div>
                                    {tpl.description && (
                                        <Paragraph
                                            type="secondary"
                                            style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-line' }}
                                        >
                                            {tpl.description}
                                        </Paragraph>
                                    )}

                                    {/* Compact HTML preview */}
                                    <Tabs
                                        size="small"
                                        style={{ marginTop: 8 }}
                                        items={[
                                            {
                                                key: 'preview',
                                                label: <Space size={4}><EyeOutlined />Preview</Space>,
                                                children: <HtmlPreview html={tpl.body_html} />,
                                            },
                                            {
                                                key: 'html',
                                                label: 'HTML source',
                                                children: (
                                                    <pre
                                                        style={{
                                                            background: '#f5f5f5',
                                                            padding: 12,
                                                            borderRadius: 4,
                                                            fontSize: 11,
                                                            maxHeight: 220,
                                                            overflowY: 'auto',
                                                            whiteSpace: 'pre-wrap',
                                                        }}
                                                    >
                                                        {tpl.body_html}
                                                    </pre>
                                                ),
                                            },
                                        ]}
                                    />
                                </Space>
                            </Card>
                        ))}
                    </div>
                )}
            </Content>

            {editing && (
                <EditTemplateModal
                    template={editing}
                    onClose={() => setEditing(null)}
                />
            )}
        </Layout>
    );
};
