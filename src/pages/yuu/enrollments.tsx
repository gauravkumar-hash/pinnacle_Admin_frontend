import { Input, Table, TableColumnsType, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { stringSort } from "@/utils/table";
import dayjs from "dayjs";
import { getYuuEnrollmentsApiAdminYuuEnrollmentsGet } from "@/services/client";

interface YuuEnrollment {
    id: string;
    patient_name: string;
    nric: string;
    tomo_id: string;
    linked_at: string;
}

export function EnrollmentsScreen() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    
    const qry = useQuery({
        queryKey: ['yuu-enrollments', page, search],
        queryFn: () => getYuuEnrollmentsApiAdminYuuEnrollmentsGet({ page, search })
    });

    const columns: TableColumnsType<YuuEnrollment> = [
        { 
            title: 'Patient Name', 
            dataIndex: 'patient_name', 
            sorter: stringSort('patient_name'),
            width: '25%'
        },
        { 
            title: 'NRIC', 
            dataIndex: 'nric',
            width: '20%'
        },
        { 
            title: 'Tomo ID', 
            dataIndex: 'tomo_id',
            width: '15%'
        },
        { 
            title: 'Linked Date', 
            dataIndex: 'linked_at', 
            render: (date) => dayjs(date + 'Z').format('YYYY-MM-DD HH:mm'),
            width: '20%'
        },
        { 
            title: 'Status', 
            render: () => <Tag color="green">Active</Tag>,
            width: '20%'
        }
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Yuu Enrollments</h2>
                <Input.Search 
                    placeholder="Search by name, NRIC, or Tomo ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: 400 }}
                    allowClear
                />
            </div>
            <Table
                columns={columns}
                dataSource={qry.data?.data}
                rowKey="id"
                pagination={{
                    current: qry.data?.pager.p,
                    total: qry.data?.pager.rows,
                    pageSize: qry.data?.pager.n,
                    onChange: setPage,
                    showSizeChanger: false,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} enrollments`
                }}
                loading={qry.isLoading}
            />
        </div>
    );
}