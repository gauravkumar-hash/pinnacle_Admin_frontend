import React, { useState, useEffect } from 'react';
import { Layout, Dropdown, Menu, Typography, Button, Tooltip, message } from 'antd';
import { MenuOutlined, LogoutOutlined, HomeOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthProvider';
import { colorConfig } from '../utils/config';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

const Topbar: React.FC<{ title?: string }> = ({ title }) => {
  const { logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  // DEBUG: This proves the file is active
  useEffect(() => {
    console.log("%c >>> TOPBAR COMPONENT ACTIVE <<< ", "background: green; color: white; font-size: 16px;");
  }, []);

  const postExportHealthReport = async (userIds: string[]) => {
    console.log("DEBUG: Export triggered for:", userIds);
    setIsExporting(true);
    
    try {
      const response = await fetch(`https://pinnacle-backend-q5zn.onrender.com/admin/health-report/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userIds),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Health_Report_${new Date().getTime()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success("Report downloaded successfully");
    } catch (err) {
      console.error("DEBUG: Export Error:", err);
      message.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') logout();
    setMenuVisible(false);
  };

  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        background: colorConfig.sidebarBackgroundColor,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        height: 56,
        boxShadow: '0 2px 8px #f0f1f2',
      }}
    >
      <Dropdown
        overlay={
          <Menu onClick={handleMenuClick}>
            <Menu.Item key="home" icon={<HomeOutlined />} onClick={() => navigate('/')}>Home</Menu.Item>
            <Menu.Item key="logout" icon={<LogoutOutlined />} danger>Logout</Menu.Item>
          </Menu>
        }
        trigger={['click']}
        visible={menuVisible}
        onVisibleChange={setMenuVisible}
      >
        <MenuOutlined style={{ fontSize: 18, color: 'white', cursor: 'pointer' }} />
      </Dropdown>

      <Typography.Title
        level={2}
        style={{ color: 'white', margin: '0 0 0 20px', flex: 1, fontSize: 18, fontWeight: 600 }}
      >
        {title || "Pinnacle Dashboard"}
      </Typography.Title>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title="Export Health Report">
          <Button 
            type="primary" 
            shape="round" 
            icon={<DownloadOutlined />} 
            loading={isExporting}
            // Currently passing a static ID for testing; you can make this dynamic later
            onClick={() => postExportHealthReport(["S7777777F"])} 
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            {isExporting ? 'Exporting...' : 'Health Report'}
          </Button>
        </Tooltip>
      </div>
    </Header>
  );
};

export default Topbar;