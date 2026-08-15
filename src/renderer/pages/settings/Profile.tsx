import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth-store';
import { Save, Check, User } from 'lucide-react';

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState(user?.displayName || 'Administrator');
  const [phone, setPhone] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saved, setSaved] = useState(false);
  const [pwChanged, setPwChanged] = useState(false);

  const saveProfile = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const changePassword = () => {
    if (!currentPw || !newPw || newPw !== confirmPw) { alert('Please fill all password fields correctly.'); return; }
    setPwChanged(true); setTimeout(() => setPwChanged(false), 2000);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">{user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-content">{user?.displayName || 'Administrator'}</h3>
            <p className="text-sm text-content-secondary">{user?.email || 'support@nexorasolution.online'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Input label="Email" value={user?.email || 'support@nexorasolution.online'} disabled />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 00000 00000" />
          <Input label="Role" defaultValue="Administrator" disabled />
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Current Password" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
          <div />
          <Input label="New Password" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <Input label="Confirm New Password" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <Button variant="secondary" size="sm" onClick={changePassword}>{pwChanged ? 'Password Updated!' : 'Update Password'}</Button>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button leftIcon={saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} onClick={saveProfile}>{saved ? 'Saved!' : 'Save Changes'}</Button>
      </div>
    </div>
  );
}
