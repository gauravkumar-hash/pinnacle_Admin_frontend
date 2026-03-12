import React, { useState } from 'react';
import { Input, Button, Card, Typography, message, Space } from 'antd';
import { DownloadOutlined, UserOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;

const HealthReportTable: React.FC = () => {
  const [nricInput, setNricInput] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const API_URL = import.meta.env.VITE_ADMIN_API_URL;

  const handleExport = async () => {
    // 1. Clean the input (split by commas or newlines, remove spaces)
    const nricList = nricInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s !== '');

    // 2. Validate input to prevent the "NRIC list cannot be empty" backend error
    if (nricList.length === 0) {
      return message.warning("Please type at least one NRIC/FIN");
    }

    console.log("DEBUG: Sending NRICs to export:", nricList);
    setIsExporting(true);

    try {
      const response = await fetch(`${API_URL}/admin/health-report/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nricList),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Export failed');
      }

      // 3. Process the file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Health_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success(`Successfully exported ${nricList.length} report(s)`);
      setNricInput(''); // Clear input on success
    } catch (err: any) {
      console.error("DEBUG: Export Error:", err);
      message.error(err.message || "Failed to export. Ensure NRICs are valid.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <Card 
        bordered={false} 
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '12px' }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Title level={3}>
            <UserOutlined /> Export Health Reports
          </Title>
          
          <Text type="secondary">
            Enter NRICs or FINs below. You can enter multiple values separated by commas or new lines.
          </Text>

          <TextArea
            rows={6}
            placeholder="Example:&#10;S1234567A&#10;S7654321B"
            value={nricInput}
            onChange={(e) => setNricInput(e.target.value)}
            disabled={isExporting}
            style={{ borderRadius: '8px', fontSize: '16px' }}
          />

          <div style={{ textAlign: 'right', marginTop: '10px' }}>
            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              loading={isExporting}
              onClick={handleExport}
              style={{ 
                backgroundColor: '#52c41a', 
                borderColor: '#52c41a',
                height: '50px',
                padding: '0 30px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {isExporting ? 'Generating Excel...' : 'Download Excel'}
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default HealthReportTable;