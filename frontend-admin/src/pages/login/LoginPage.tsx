import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import api from '../../api';
import { useAuthStore } from '../../store/auth.store';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력하세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ accessToken: string }>('/auth/master/login', {
        email,
        password,
      });
      setToken(res.data.accessToken);
      navigate('/tenants');
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex align-items-center justify-content-center min-h-screen bg-gray-900">
      <Card title="SOAR Master Admin" className="w-full md:w-4">
        <div className="flex flex-column gap-3">
          {error && <Message severity="error" text={error} />}
          <div>
            <label className="block mb-1 text-sm">이메일</label>
            <InputText
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              placeholder="admin@soar.io"
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
          <Button
            label="로그인"
            icon="pi pi-sign-in"
            onClick={handleLogin}
            loading={loading}
            className="w-full"
          />
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
