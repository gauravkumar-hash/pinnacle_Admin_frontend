import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ContentView } from "@/components/Content";
import {
  Campaign,
  CampaignStatus,
  CampaignType,
  CONSENT_NOTICE_DEFAULT_BODY,
  createCampaign,
  deleteCampaign,
  getCampaign,
  listCampaigns,
  listRecipients,
  OPT_OUT_DEEP_LINK,
  pauseCampaign,
  prepareCampaign,
  resumeCampaign,
  startCampaign,
} from "@/apis/marketingCampaigns";

const TYPE_LABEL: Record<CampaignType, string> = {
  consent_notice: "Consent notice",
  marketing: "Marketing",
  system: "System",
};

const STATUS_COLOR: Record<CampaignStatus, string> = {
  draft: "default",
  building: "processing",
  queued: "cyan",
  sending: "blue",
  paused: "orange",
  completed: "green",
  failed: "red",
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export function MarketingCampaignsScreen() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const qry = useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: listCampaigns,
    // Poll while anything is in flight so progress bars stay live.
    refetchInterval: (q) =>
      (q.state.data ?? []).some((c) => c.status === "sending" || c.status === "building")
        ? 4000
        : false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });

  const createMut = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      message.success("Campaign created");
      setCreateOpen(false);
      form.resetFields();
      invalidate();
    },
    onError: (e) => message.error(errMsg(e)),
  });

  const actionMut = useMutation({
    mutationFn: ({ fn, id }: { fn: (id: string) => Promise<unknown>; id: string }) => fn(id),
    onSuccess: () => {
      message.success("Done");
      invalidate();
    },
    onError: (e) => message.error(errMsg(e)),
  });

  const run = (fn: (id: string) => Promise<unknown>, id: string) => actionMut.mutate({ fn, id });

  const columns: ColumnsType<Campaign> = useMemo(
    () => [
      {
        title: "Title",
        dataIndex: "title",
        render: (t: string, r) => (
          <a onClick={() => setDetailId(r.id)}>{t}</a>
        ),
      },
      {
        title: "Type",
        dataIndex: "type",
        width: 130,
        render: (t: CampaignType) => <Tag>{TYPE_LABEL[t]}</Tag>,
      },
      {
        title: "Status",
        dataIndex: "status",
        width: 110,
        render: (s: CampaignStatus) => <Tag color={STATUS_COLOR[s]}>{s}</Tag>,
      },
      {
        title: "Progress",
        width: 260,
        render: (_, r) => {
          if (r.total_recipients === 0) return <span style={{ color: "#999" }}>—</span>;
          const done = r.sent_count + r.failed_count + r.skipped_count;
          return (
            <div>
              <Progress
                percent={Math.round((done / r.total_recipients) * 100)}
                size="small"
                status={r.status === "sending" ? "active" : undefined}
              />
              <div style={{ fontSize: 12, color: "#666" }}>
                {r.sent_count.toLocaleString()} sent · {r.failed_count} failed ·{" "}
                {r.skipped_count} skipped · {r.total_recipients.toLocaleString()} total
              </div>
            </div>
          );
        },
      },
      {
        title: "Created",
        dataIndex: "created_at",
        width: 160,
        render: (d: string | null) => (d ? new Date(d).toLocaleString() : "—"),
      },
      {
        title: "Actions",
        width: 260,
        render: (_, r) => (
          <Space wrap>
            {(r.status === "draft" || r.status === "queued") && (
              <Button size="small" onClick={() => run(prepareCampaign, r.id)}>
                {r.status === "queued" ? "Rebuild audience" : "Prepare audience"}
              </Button>
            )}
            {r.status === "queued" && (
              <Button size="small" type="primary" onClick={() => run(startCampaign, r.id)}>
                Start
              </Button>
            )}
            {r.status === "sending" && (
              <Button size="small" onClick={() => run(pauseCampaign, r.id)}>
                Pause
              </Button>
            )}
            {r.status === "paused" && (
              <Button size="small" type="primary" onClick={() => run(resumeCampaign, r.id)}>
                Resume
              </Button>
            )}
            {r.status === "draft" && (
              <Popconfirm title="Delete this draft?" onConfirm={() => run(deleteCampaign, r.id)}>
                <Button size="small" danger>
                  Delete
                </Button>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <ContentView
      title="Marketing Campaigns"
      actions={
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          New Campaign
        </Button>
      }
    >
      <Table
        rowKey="id"
        loading={qry.isPending}
        dataSource={qry.data ?? []}
        columns={columns}
        pagination={{ pageSize: 20 }}
      />

      <CreateModal
        open={createOpen}
        form={form}
        confirmLoading={createMut.isPending}
        onCancel={() => setCreateOpen(false)}
        onSubmit={(v) => createMut.mutate(v)}
      />

      <DetailDrawer id={detailId} onClose={() => setDetailId(null)} />
    </ContentView>
  );
}

/* --------------------------------------------------------------- create modal */
function CreateModal({
  open,
  form,
  confirmLoading,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (v: {
    type: CampaignType;
    title: string;
    body: string;
    data: Record<string, unknown>;
  }) => void;
}) {
  return (
    <Modal
      title="New campaign"
      open={open}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      okText="Create"
      onOk={() =>
        form.validateFields().then((v: { type: CampaignType; title: string; body: string }) =>
          onSubmit({ ...v, data: OPT_OUT_DEEP_LINK }),
        )
      }
      destroyOnClose
      width={620}
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ type: "consent_notice" }}
        onValuesChange={(changed) => {
          if (changed.type === "consent_notice" && !form.getFieldValue("body")) {
            form.setFieldValue("body", CONSENT_NOTICE_DEFAULT_BODY);
          }
        }}
      >
        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "consent_notice", label: "Consent notice — sent to ALL app users" },
              { value: "marketing", label: "Marketing — opted-in users only" },
              { value: "system", label: "System — sent to ALL app users" },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="title"
          label="Notification header"
          rules={[{ required: true, max: 120 }]}
        >
          <Input placeholder="About your notifications" maxLength={120} showCount />
        </Form.Item>
        <Form.Item
          name="body"
          label="Notification message"
          rules={[{ required: true, max: 500 }]}
          extra="Tapping the notification opens the in-app Notification Settings screen where the user can opt out."
        >
          <Input.TextArea rows={4} maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* -------------------------------------------------------------- detail drawer */
function DetailDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [recipStatus, setRecipStatus] = useState<string | undefined>(undefined);

  const campaignQ = useQuery({
    queryKey: ["marketing-campaign", id],
    queryFn: () => getCampaign(id as string),
    enabled: !!id,
    refetchInterval: (q) =>
      q.state.data && (q.state.data.status === "sending" || q.state.data.status === "building")
        ? 4000
        : false,
  });

  const recipQ = useQuery({
    queryKey: ["marketing-campaign-recipients", id, recipStatus],
    queryFn: () => listRecipients(id as string, { status: recipStatus, limit: 100 }),
    enabled: !!id,
  });

  const c = campaignQ.data;

  return (
    <Drawer
      title={c ? c.title : "Campaign"}
      open={!!id}
      onClose={onClose}
      width={720}
    >
      {c && (
        <>
          <Space size="large" wrap style={{ marginBottom: 16 }}>
            <Stat label="Status" value={c.status} />
            <Stat label="Total" value={c.total_recipients.toLocaleString()} />
            <Stat label="Sent" value={c.sent_count.toLocaleString()} />
            <Stat label="Failed" value={c.failed_count.toLocaleString()} />
            <Stat label="Skipped" value={c.skipped_count.toLocaleString()} />
            <Stat label="Pending" value={c.pending_count.toLocaleString()} />
          </Space>

          <p style={{ color: "#666", whiteSpace: "pre-wrap" }}>{c.body}</p>

          <Space style={{ margin: "12px 0" }}>
            <span>Filter recipients:</span>
            <Select
              allowClear
              placeholder="All"
              style={{ width: 180 }}
              value={recipStatus}
              onChange={setRecipStatus}
              options={[
                { value: "sent", label: "sent" },
                { value: "pending", label: "pending" },
                { value: "failed", label: "failed" },
                { value: "skipped", label: "skipped" },
                { value: "invalid_token", label: "invalid_token" },
              ]}
            />
            <span style={{ color: "#999" }}>{recipQ.data?.total ?? 0} rows</span>
          </Space>

          <Table
            rowKey="account_id"
            size="small"
            loading={recipQ.isPending}
            dataSource={recipQ.data?.rows ?? []}
            pagination={{ pageSize: 20 }}
            columns={[
              { title: "Account", dataIndex: "account_id", ellipsis: true },
              { title: "Status", dataIndex: "status", width: 120 },
              { title: "Tries", dataIndex: "attempts", width: 70 },
              { title: "Error", dataIndex: "last_error", ellipsis: true },
              {
                title: "Sent at",
                dataIndex: "sent_at",
                width: 170,
                render: (d: string | null) => (d ? new Date(d).toLocaleString() : "—"),
              },
            ]}
          />
        </>
      )}
    </Drawer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#999" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
