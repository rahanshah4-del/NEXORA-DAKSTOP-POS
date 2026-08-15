import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Separator } from '@/components/ui/Separator';
import { Save, Check, Download, RefreshCw } from 'lucide-react';

export default function Security() {
  const [timeout, setTimeout_] = useState('30');
  const [minPw, setMinPw] = useState('8');
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const exportData = () => { setExporting(true); setTimeout(() => setExporting(false), 1500); alert('Data exported successfully!'); };
  const syncNow = () => { setSyncing(true); setTimeout(() => setSyncing(false), 2000); alert('Sync completed!'); };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Session Timeout" options={[
            { value: '15', label: '15 minutes' }, { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' }, { value: '0', label: 'Never' },
          ]} value={timeout} onChange={(e) => setTimeout_(e.target.value)} />
          <Select label="Min Password Length" options={[
            { value: '6', label: '6 characters' }, { value: '8', label: '8 characters' }, { value: '12', label: '12 characters' },
          ]} value={minPw} onChange={(e) => setMinPw(e.target.value)} />
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Data & Backup</CardTitle></CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm font-medium text-content">Local Database</p><p className="text-xs text-content-secondary">SQLite database stored locally</p></div>
            <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={exportData}>{exporting ? 'Exporting...' : 'Export Data'}</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm font-medium text-content">Cloud Sync</p><p className="text-xs text-content-secondary">Sync data with Firebase Firestore</p></div>
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />} onClick={syncNow}>{syncing ? 'Syncing...' : 'Sync Now'}</Button>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button leftIcon={saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} onClick={save}>{saved ? 'Saved!' : 'Save Changes'}</Button>
      </div>
    </div>
  );
}
