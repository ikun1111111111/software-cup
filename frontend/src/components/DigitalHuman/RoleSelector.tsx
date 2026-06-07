import React from 'react';
import request from '../../api/request';

interface Role {
  role_id: string;
  name: string;
  description: string;
}

interface Props {
  currentRole: string;
  onRoleChange: (role: string, greeting: string) => void;
}

const roleIcons: Record<string, string> = {
  default: '🤖',
  buddha: '🪷',
  zen_master: '🧘',
  tourist: '📸',
  historian: '📜',
};

const roleColors: Record<string, string> = {
  default: '#1A5FB4',
  buddha: '#B45309',
  zen_master: '#059669',
  tourist: '#DC2626',
  historian: '#7C3AED',
};

const RoleSelector: React.FC<Props> = ({ currentRole, onRoleChange }) => {
  const [roles, setRoles] = React.useState<Role[]>([
    { role_id: 'default', name: '数字人导游', description: '默认导游角色' },
    { role_id: 'buddha', name: '佛祖化身', description: '庄严慈悲' },
    { role_id: 'zen_master', name: '灵山禅师', description: '禅意哲理' },
    { role_id: 'tourist', name: '游客朋友', description: '轻松活泼' },
    { role_id: 'historian', name: '徐霞客', description: '游记文风' },
  ]);

  const handleSelect = async (roleId: string) => {
    try {
      const res = await request.post('/chat/role', { session_id: 'web', role: roleId });
      const data = (res as any).data ?? res;
      onRoleChange(roleId, data.greeting || '');
    } catch {
      onRoleChange(roleId, '');
    }
  };

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 0' }}>
      {roles.map((role) => {
        const active = currentRole === role.role_id;
        const color = roleColors[role.role_id] || '#666';
        return (
          <button
            key={role.role_id}
            onClick={() => handleSelect(role.role_id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 20, fontSize: 13,
              border: active ? 'none' : `1px solid ${color}30`,
              background: active ? color : `${color}08`,
              color: active ? '#fff' : color,
              fontWeight: active ? 600 : 400,
              cursor: 'pointer', transition: 'all 200ms ease',
            }}
          >
            <span style={{ fontSize: 16 }}>{roleIcons[role.role_id] || '🤖'}</span>
            {role.name}
          </button>
        );
      })}
    </div>
  );
};

export default RoleSelector;
