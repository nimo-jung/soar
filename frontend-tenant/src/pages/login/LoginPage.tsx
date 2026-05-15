import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import api from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { useBrandingStore } from '../../store/branding.store';
import { parseJwt } from '../../utils/jwt';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const applyBranding = useBrandingStore((s) => s.applyBranding);
  const branding = useBrandingStore((s) => s.branding);

  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!tenantSlug || !email || !password) {
      setError('모든 필드를 입력하세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ accessToken: string; brandingConfig: Record<string, string> | null }>(
        '/auth/tenant/login',
        { tenantSlug, email, password },
      );
      const payload = parseJwt(res.data.accessToken);
      setAuth(res.data.accessToken, { sub: payload.sub, tenantId: payload.tenantId, role: payload.role });
      applyBranding(res.data.brandingConfig);
      navigate('/dashboard');
    } catch {
      setError('로그인 정보를 확인하세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex align-items-center justify-content-center min-h-screen bg-gray-900">
      <Card
        title={branding.companyName ?? 'SOAR'}
        style={{ borderTop: `4px solid ${branding.primaryColor ?? '#3B82F6'}` }}
        className="w-full md:w-4"
      >
        <div className="flex flex-column gap-3">
          {error && <Message severity="error" text={error} />}
          <div>
            <label className="block mb-1 text-sm">테넌트 슬러그</label>
            <InputText
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              className="w-full"
              placeholder="acme-corp"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">이메일</label>
            <InputText
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">비밀번호</label>
            <Password
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              feedback={false}
              toggleMask
            />
          </div>
          <Button label="로그인" icon="pi pi-sign-in" onClick={handleLogin} loading={loading} className="w-full" />
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
