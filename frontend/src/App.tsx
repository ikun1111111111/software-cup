import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Routes>
        {/* Tourist routes — to be implemented by 队员2 */}
        <Route path="/" element={<div style={{ padding: 40, textAlign: 'center' }}>
          <h1>🏯 智慧灵山胜境</h1>
          <p>数字人导览系统</p>
          <p style={{ color: '#888' }}>游客端页面将由队员2实现 (B-001)</p>
        </div>} />

        {/* Admin routes — to be implemented by 队员2 */}
        <Route path="/admin" element={<div style={{ padding: 40, textAlign: 'center' }}>
          <h1>⚙️ 管理后台</h1>
          <p style={{ color: '#888' }}>管理端页面将由队员2实现 (B-003 ~ B-005)</p>
        </div>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfigProvider>
  );
}

export default App;
