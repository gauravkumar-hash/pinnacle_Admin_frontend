import { useState } from "react";
import {
  Table,
  Select,
  Button,
  Space,
  message,
  Spin,
  Typography,
  Card,
  Alert,
  Tooltip,
  Tag,
  Progress,
  DatePicker,
  Row,
  Col,
  Statistic,
  Badge,
} from "antd";
import { ColumnsType } from "antd/es/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { QueryStateHandler } from "../../components/QueryStateHandler";
import { PageLoading } from "../../components/LoadingStates";
import { ErrorAlert } from "../../components/ErrorHandling";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import { useAuth } from "../../context/AuthProvider";
import {
  getBranchesApiAdminBranchesGet,
  getBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdGet,
  updateBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdPut,
  BranchListDetails,
  BranchOperatingHoursResponse,
  DayOfWeek,
} from "../../services/client";
import TimeSelection from "../../components/TimeSelection";

const { Title, Text } = Typography;

// Days mapping for conversion between API and UI
const DAYS_MAP: { [key: string]: DayOfWeek } = {
  Monday: "Monday",
  Tuesday: "Tuesday",
  Wednesday: "Wednesday",
  Thursday: "Thursday",
  Friday: "Friday",
  Saturday: "Saturday",
  Sunday: "Sunday",
  PH: "Public Holiday",
};

const REVERSE_DAYS_MAP: { [key in DayOfWeek]: string } = {
  Monday: "Monday",
  Tuesday: "Tuesday",
  Wednesday: "Wednesday",
  Thursday: "Thursday",
  Friday: "Friday",
  Saturday: "Saturday",
  Sunday: "Sunday",
  "Public Holiday": "PH",
};

interface TimeInterval {
  id: string;
  start: number; // minutes from midnight
  end: number; // minutes from midnight
  cutoff_time?: number; // cutoff time in minutes
  max_appointments_per_session?: number; // max appointments per session
}

interface OperatingHours {
  [key: string]: TimeInterval[];
}

// Helper functions for time conversion
const timeStringToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

// Convert API response to UI format
const convertApiToUiFormat = (
  apiResponse: BranchOperatingHoursResponse,
): OperatingHours => {
  const result: OperatingHours = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
    PH: [],
  };

  // Convert from API format to UI format
  Object.entries(apiResponse.operating_hours).forEach(([day, hours]) => {
    const uiDay = REVERSE_DAYS_MAP[day as DayOfWeek] || day;

    if (result[uiDay]) {
      result[uiDay] = hours.map((hour: any, index: number) => ({
        id: `${uiDay}-${index}`,
        start: timeStringToMinutes(hour.start_time),
        end: timeStringToMinutes(hour.end_time),
        cutoff_time: hour.cutoff_time || 0,
        max_appointments_per_session:
          hour.max_appointments_per_session || undefined,
      }));
    }
  });

  return result;
};

// Convert UI format to API format
const convertUiToApiFormat = (
  uiHours: OperatingHours,
): { [key: string]: any } => {
  const result: { [key: string]: any } = {};

  Object.entries(uiHours).forEach(([day, intervals]) => {
    const apiDay = DAYS_MAP[day];
    if (apiDay && intervals.length > 0) {
      result[apiDay] = intervals.map((interval) => ({
        start_time: minutesToTimeString(interval.start),
        end_time: minutesToTimeString(interval.end),
        cutoff_time: interval.cutoff_time || 0,
        max_appointments_per_session:
          interval.max_appointments_per_session || null,
      }));
    }
  });

  return result;
};

// Session capacity types (from new backend endpoint)
interface SessionSlotCapacity {
  slot_id: string;
  day: string;
  start_time: string;
  end_time: string;
  max_appointments_per_session: number | null;
  booked_count: number;
  available: number | null;
  is_full: boolean;
}

interface BranchSessionCapacityResponse {
  branch_id: string;
  branch_name: string;
  date: string;
  slots: SessionSlotCapacity[];
}

export default function OnsiteHours() {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [capacityDate, setCapacityDate] = useState<Dayjs>(dayjs());
  const { session } = useAuth();
  const queryClient = useQueryClient();

  // Error handler for mutations
  const { handleError: handleMutationError } = useErrorHandler({
    showNotification: true,
    retryable: false,
  });

  // Fetch branches
  const {
    data: branches,
    isPending: branchesLoading,
    isError: branchesError,
    error: branchesErrorDetail,
    refetch: refetchBranches,
  } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranchesApiAdminBranchesGet,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch operating hours for selected branch
  const {
    data: operatingHoursData,
    isPending: operatingHoursLoading,
    isError: operatingHoursError,
    error: operatingHoursErrorDetail,
    refetch: refetchOperatingHours,
  } = useQuery({
    queryKey: ["operating-hours", selectedBranchId],
    queryFn: () =>
      getBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdGet({
        branchId: selectedBranchId!,
      }),
    enabled: !!selectedBranchId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch session capacity for selected branch + date
  const {
    data: capacityData,
    isLoading: capacityLoading,
    refetch: refetchCapacity,
  } = useQuery<BranchSessionCapacityResponse>({
    queryKey: [
      "session-capacity",
      selectedBranchId,
      capacityDate.format("YYYY-MM-DD"),
    ],
    queryFn: async () => {
      const token = session?.access_token;
      const res = await fetch(
        `/api/admin/appointments/v1/operating-hours/${selectedBranchId}/session-capacity?date=${capacityDate.format("YYYY-MM-DD")}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch capacity");
      return res.json();
    },
    enabled: !!selectedBranchId && !!session,
    refetchInterval: 60_000, // auto-refresh every minute
  });

  // Update operating hours mutation
  const updateOperatingHoursMutation = useMutation({
    mutationFn: ({
      branchId,
      hours,
    }: {
      branchId: string;
      hours: OperatingHours;
    }) =>
      updateBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdPut(
        {
          branchId,
          requestBody: convertUiToApiFormat(hours),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["operating-hours", selectedBranchId],
      });
      message.success("Operating hours saved successfully");
    },
    onError: (error: any) => {
      handleMutationError(error, "operating hours update");
    },
  });

  const handleSave = async (hours: OperatingHours) => {
    if (!selectedBranchId) {
      message.error("No branch selected");
      return;
    }

    updateOperatingHoursMutation.mutate({ branchId: selectedBranchId, hours });
  };

  // Helper function to get operating hours summary
  const getOperatingHoursSummary = (branchId: string) => {
    if (branchId === selectedBranchId && operatingHoursData) {
      const hours = operatingHoursData.operating_hours;
      const daysWithHours = Object.keys(hours).length;
      return daysWithHours > 0
        ? `${daysWithHours} days configured`
        : "No hours set";
    }
    return "Not loaded";
  };

  const columns: ColumnsType<BranchListDetails> = [
    {
      title: "Branch ID",
      dataIndex: "id",
      key: "id",
      width: 120,
      render: (id: string) => <Tag color="blue">{id}</Tag>,
    },
    {
      title: "Branch Name",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "is_open",
      key: "is_open",
      width: 100,
      render: (isOpen: boolean) => (
        <Tag
          icon={isOpen ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={isOpen ? "success" : "default"}
        >
          {isOpen ? "Open" : "Closed"}
        </Tag>
      ),
    },
    {
      title: "Operating Hours",
      key: "operating_hours",
      width: 150,
      render: (_, record) => (
        <Tooltip title="Click 'Configure Hours' to view details">
          <Text type="secondary" className="text-xs">
            <ClockCircleOutlined className="mr-1" />
            {getOperatingHoursSummary(record.id)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type={selectedBranchId === record.id ? "primary" : "default"}
            onClick={() => setSelectedBranchId(record.id)}
            icon={<ClockCircleOutlined />}
            size="small"
          >
            {selectedBranchId === record.id ? "Selected" : "Configure Hours"}
          </Button>
        </Space>
      ),
    },
  ];

  const selectedBranch = branches?.find((b) => b.id === selectedBranchId);

  return (
    <ErrorBoundary>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Title level={2} className="mb-2">
              Appointment Onsite Hours
            </Title>
            <Text type="secondary">
              Configure operating hours for each branch to manage appointment
              availability
            </Text>
          </div>
          <Space>
            <Tooltip title="Refresh branches list">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetchBranches()}
                loading={branchesLoading}
                size="small"
              >
                Refresh
              </Button>
            </Tooltip>
          </Space>
        </div>

        {/* Error alert for mutation */}
        {updateOperatingHoursMutation.isError &&
          updateOperatingHoursMutation.error && (
            <ErrorAlert
              error={updateOperatingHoursMutation.error}
              onDismiss={() => updateOperatingHoursMutation.reset()}
              className="mb-4"
            />
          )}

        <QueryStateHandler
          query={
            {
              data: branches,
              isLoading: branchesLoading,
              isError: branchesError,
              error: branchesError ? branchesErrorDetail : null,
              refetch: refetchBranches,
            } as any
          }
          loadingSkeleton={<PageLoading message="Loading branches..." />}
          isEmpty={(data) =>
            !data || (Array.isArray(data) && data.length === 0)
          }
          emptyTitle="No branches found"
          emptyDescription="No branches are available to configure operating hours."
        >
          {(branches: BranchListDetails[]) => (
            <>
              <Card className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <Title level={4} className="mb-0">
                    Select Branch
                  </Title>
                  {selectedBranchId && (
                    <Space>
                      <Text type="secondary">
                        Configuring: <strong>{selectedBranch?.name}</strong>
                      </Text>
                      <Button
                        size="small"
                        type="link"
                        onClick={() => setSelectedBranchId(null)}
                      >
                        Clear Selection
                      </Button>
                    </Space>
                  )}
                </div>

                <Space
                  className="mb-4 w-full"
                  direction="vertical"
                  size="large"
                >
                  <Select
                    placeholder="Select a branch to configure operating hours"
                    className="w-full max-w-md"
                    onChange={(value) => setSelectedBranchId(value)}
                    value={selectedBranchId}
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={branches?.map((branch: BranchListDetails) => ({
                      value: branch.id,
                      label: `${branch.name} (${branch.id})`,
                    }))}
                  />
                </Space>

                <Table
                  columns={columns}
                  dataSource={branches}
                  rowKey="id"
                  pagination={false}
                  className="mb-6"
                />
              </Card>

              {selectedBranchId && (
                <div className="mt-8">
                  <QueryStateHandler
                    query={
                      {
                        data: operatingHoursData,
                        isLoading: operatingHoursLoading,
                        isError: operatingHoursError,
                        error: operatingHoursError
                          ? operatingHoursErrorDetail
                          : null,
                        refetch: refetchOperatingHours,
                      } as any
                    }
                    loadingSkeleton={
                      <Card>
                        <div className="flex items-center justify-center py-8">
                          <Space direction="vertical" align="center">
                            <Spin size="large" />
                            <Text type="secondary">
                              Loading operating hours...
                            </Text>
                          </Space>
                        </div>
                      </Card>
                    }
                    isEmpty={(data) => !data}
                    emptyState={
                      <Card>
                        <Alert
                          message="No operating hours configured"
                          description="No operating hours found for this branch. You can configure them using the time selection interface below."
                          type="info"
                          showIcon
                          action={
                            <Button
                              type="primary"
                              size="small"
                              onClick={() => {
                                // Initialize with default hours for the branch
                                const defaultHours: OperatingHours = {
                                  Monday: [
                                    { id: "mon-1", start: 540, end: 1020 },
                                  ], // 9 AM - 5 PM
                                  Tuesday: [
                                    { id: "tue-1", start: 540, end: 1020 },
                                  ],
                                  Wednesday: [
                                    { id: "wed-1", start: 540, end: 1020 },
                                  ],
                                  Thursday: [
                                    { id: "thu-1", start: 540, end: 1020 },
                                  ],
                                  Friday: [
                                    { id: "fri-1", start: 540, end: 1020 },
                                  ],
                                  Saturday: [
                                    { id: "sat-1", start: 540, end: 720 },
                                  ], // 9 AM - 12 PM
                                  Sunday: [],
                                  PH: [],
                                };
                                handleSave(defaultHours);
                              }}
                            >
                              Set Default Hours
                            </Button>
                          }
                        />
                        <div className="mt-4">
                          <TimeSelection
                            branchName={selectedBranch?.name}
                            initialHours={{
                              Monday: [],
                              Tuesday: [],
                              Wednesday: [],
                              Thursday: [],
                              Friday: [],
                              Saturday: [],
                              Sunday: [],
                              PH: [],
                            }}
                            onSave={handleSave}
                            loading={updateOperatingHoursMutation.isPending}
                          />
                        </div>
                      </Card>
                    }
                  >
                    {(data: BranchOperatingHoursResponse) => {
                      const convertedOperatingHours =
                        convertApiToUiFormat(data);

                      // Summarise capacity for stat cards
                      const slots = capacityData?.slots ?? [];
                      const slotsWithLimit = slots.filter(
                        (s) => s.max_appointments_per_session !== null,
                      );
                      const fullSlots = slots.filter((s) => s.is_full).length;
                      const totalBooked = slots.reduce(
                        (acc, s) => acc + s.booked_count,
                        0,
                      );

                      return (
                        <Spin spinning={updateOperatingHoursMutation.isPending}>
                          <div className="space-y-4">
                            {updateOperatingHoursMutation.isPending && (
                              <Alert
                                message="Saving operating hours..."
                                description="Please wait while we update the operating hours"
                                type="info"
                                showIcon
                              />
                            )}

                            {/* ── Capacity Overview Panel ── */}
                            <Card
                              title={
                                <Space>
                                  <BarChartOutlined />
                                  <span>Session Capacity</span>
                                  <Tag color="blue">{selectedBranch?.name}</Tag>
                                </Space>
                              }
                              extra={
                                <Space>
                                  <DatePicker
                                    value={capacityDate}
                                    onChange={(d) => d && setCapacityDate(d)}
                                    format="DD MMM YYYY"
                                    allowClear={false}
                                    suffixIcon={<CalendarOutlined />}
                                  />
                                  <Button
                                    size="small"
                                    icon={<ReloadOutlined />}
                                    onClick={() => refetchCapacity()}
                                    loading={capacityLoading}
                                  >
                                    Refresh
                                  </Button>
                                </Space>
                              }
                            >
                              {/* Stat summary row */}
                              <Row gutter={16} className="mb-4">
                                <Col span={6}>
                                  <Statistic
                                    title="Total Booked Today"
                                    value={totalBooked}
                                    prefix={<CalendarOutlined />}
                                  />
                                </Col>
                                <Col span={6}>
                                  <Statistic
                                    title="Slots with Limit Set"
                                    value={slotsWithLimit.length}
                                    suffix={`/ ${slots.length}`}
                                  />
                                </Col>
                                <Col span={6}>
                                  <Statistic
                                    title="Full Slots"
                                    value={fullSlots}
                                    valueStyle={{
                                      color:
                                        fullSlots > 0 ? "#cf1322" : "#3f8600",
                                    }}
                                  />
                                </Col>
                                <Col span={6}>
                                  <Statistic
                                    title="Available Slots"
                                    value={slotsWithLimit.length - fullSlots}
                                    valueStyle={{ color: "#3f8600" }}
                                  />
                                </Col>
                              </Row>

                              {/* Per-slot capacity rows */}
                              {capacityLoading ? (
                                <div className="flex items-center justify-center py-6">
                                  <Spin />
                                  <Text type="secondary" className="ml-2">
                                    Loading capacity data…
                                  </Text>
                                </div>
                              ) : slots.length === 0 ? (
                                <Alert
                                  type="info"
                                  showIcon
                                  message={`No time slots configured for ${capacityDate.format("dddd, DD MMM YYYY")}`}
                                  description="This branch has no operating hours for the selected day, or no slots have been saved yet."
                                />
                              ) : (
                                <div className="space-y-3">
                                  {slots.map((slot) => {
                                    const hasLimit =
                                      slot.max_appointments_per_session !==
                                      null;
                                    const pct = hasLimit
                                      ? Math.min(
                                          100,
                                          Math.round(
                                            (slot.booked_count /
                                              slot.max_appointments_per_session!) *
                                              100,
                                          ),
                                        )
                                      : 0;
                                    const statusColor = !hasLimit
                                      ? "default"
                                      : slot.is_full
                                        ? "error"
                                        : pct >= 75
                                          ? "warning"
                                          : "success";
                                    const statusText = !hasLimit
                                      ? "No Limit"
                                      : slot.is_full
                                        ? "Full"
                                        : pct >= 75
                                          ? "Almost Full"
                                          : "Available";

                                    return (
                                      <div
                                        key={slot.slot_id}
                                        className="border border-gray-200 rounded-lg p-3"
                                      >
                                        <div className="flex justify-between items-center mb-2">
                                          <Space>
                                            <ClockCircleOutlined className="text-blue-500" />
                                            <Text strong>
                                              {slot.start_time} –{" "}
                                              {slot.end_time}
                                            </Text>
                                            <Badge
                                              status={
                                                statusColor === "error"
                                                  ? "error"
                                                  : statusColor === "warning"
                                                    ? "warning"
                                                    : statusColor === "success"
                                                      ? "success"
                                                      : "default"
                                              }
                                              text={
                                                <Tag
                                                  color={
                                                    statusColor === "default"
                                                      ? "default"
                                                      : statusColor
                                                  }
                                                >
                                                  {statusText}
                                                </Tag>
                                              }
                                            />
                                          </Space>
                                          <Space>
                                            <Text
                                              type="secondary"
                                              className="text-sm"
                                            >
                                              {slot.booked_count} booked
                                            </Text>
                                            {hasLimit ? (
                                              <>
                                                <Text type="secondary">
                                                  /{" "}
                                                  {
                                                    slot.max_appointments_per_session
                                                  }{" "}
                                                  max
                                                </Text>
                                                <Tag
                                                  color={
                                                    slot.is_full
                                                      ? "red"
                                                      : "green"
                                                  }
                                                >
                                                  {slot.available} left
                                                </Tag>
                                              </>
                                            ) : (
                                              <Tag color="default">
                                                Unlimited
                                              </Tag>
                                            )}
                                          </Space>
                                        </div>
                                        {hasLimit && (
                                          <Progress
                                            percent={pct}
                                            size="small"
                                            status={
                                              slot.is_full
                                                ? "exception"
                                                : pct >= 75
                                                  ? "normal"
                                                  : "success"
                                            }
                                            strokeColor={
                                              slot.is_full
                                                ? "#ff4d4f"
                                                : pct >= 75
                                                  ? "#faad14"
                                                  : "#52c41a"
                                            }
                                            format={(p) => `${p}%`}
                                          />
                                        )}
                                        {!hasLimit && (
                                          <Alert
                                            type="info"
                                            showIcon={false}
                                            message={
                                              <Text
                                                type="secondary"
                                                className="text-xs"
                                              >
                                                No session limit set — edit this
                                                slot to add a max appointments
                                                cap
                                              </Text>
                                            }
                                            className="py-1"
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </Card>

                            <TimeSelection
                              branchName={selectedBranch?.name}
                              initialHours={convertedOperatingHours}
                              onSave={handleSave}
                              loading={updateOperatingHoursMutation.isPending}
                            />
                          </div>
                        </Spin>
                      );
                    }}
                  </QueryStateHandler>
                </div>
              )}
            </>
          )}
        </QueryStateHandler>
      </div>
    </ErrorBoundary>
  );
}
