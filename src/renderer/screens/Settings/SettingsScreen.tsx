import React, { useEffect, useState } from 'react';
import { useSettings } from '@/presentation/hooks/useSettings';
import { notifySuccess } from '@/stores/toast-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { useTheme } from '@/hooks/useTheme';
import { Save, Download, Database, Monitor, Moon, Sun } from 'lucide-react';

const SETTINGS_TABS = [
  { id: 'general', label: 'General' }, { id: 'tax', label: 'Tax & Receipt' },
  { id: 'printer', label: 'Printer' }, { id: 'backup', label: 'Backup' }, { id: 'theme', label: 'Theme' },
];

export const SettingsScreen: React.FC = () => {
  const { settings, updateSetting, refetchSettings, isLoading } = useSettings() as any;
  const { theme, toggleTheme } = useTheme() as any;
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => { refetchSettings?.(); }, []);
  useEffect(() => { if (settings) setFormData({ ...settings }); }, [settings]);

  const handleSave = async (key: string, value: string) => { await updateSetting?.(key, value); notifySuccess('Saved', `Setting updated`); };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl" role="region" aria-label="Settings">
      <div><h1 className="text-2xl font-bold text-content">Settings</h1><p className="text-sm text-content-secondary mt-0.5">Configure your restaurant POS</p></div>

      <Tabs tabs={SETTINGS_TABS} activeTab={activeTab} onChange={setActiveTab} />

      <Card padding="xl" className="space-y-6">
        {activeTab === 'general' && (
          <section aria-label="General settings">
            <h3 className="text-base font-semibold text-content mb-5">Restaurant Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Restaurant Name" value={formData['restaurant.name'] ?? ''} onChange={(e) => setFormData(p => ({ ...p, 'restaurant.name': e.target.value }))} />
              <Input label="Currency Symbol" value={formData['currency.symbol'] ?? '$'} onChange={(e) => setFormData(p => ({ ...p, 'currency.symbol': e.target.value }))} />
              <Input label="Phone" value={formData['restaurant.phone'] ?? ''} onChange={(e) => setFormData(p => ({ ...p, 'restaurant.phone': e.target.value }))} />
              <Input label="Email" value={formData['restaurant.email'] ?? ''} onChange={(e) => setFormData(p => ({ ...p, 'restaurant.email': e.target.value }))} />
            </div>
            <Button className="mt-5" onClick={() => { handleSave('restaurant.name', formData['restaurant.name'] ?? ''); handleSave('restaurant.phone', formData['restaurant.phone'] ?? ''); }} leftIcon={<Save className="w-4 h-4" />}>Save General</Button>
          </section>
        )}

        {activeTab === 'tax' && (
          <section aria-label="Tax and receipt settings">
            <h3 className="text-base font-semibold text-content mb-5">Tax & Receipt Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Tax Rate (bps)" type="number" value={formData['tax.rateBps'] ?? '850'} onChange={(e) => setFormData(p => ({ ...p, 'tax.rateBps': e.target.value }))} hint="850 = 8.5%" />
              <Input label="Tax Name" value={formData['tax.name'] ?? 'VAT'} onChange={(e) => setFormData(p => ({ ...p, 'tax.name': e.target.value }))} />
              <div className="md:col-span-2"><Input label="Receipt Footer" value={formData['receipt.footer'] ?? 'Thank you!'} onChange={(e) => setFormData(p => ({ ...p, 'receipt.footer': e.target.value }))} /></div>
            </div>
            <div className="mt-4 space-y-3">
              {['tax.inclusive', 'receipt.printOnComplete', 'tips.enabled'].map(key => (
                <label key={key} className="flex items-center gap-3 py-1.5 cursor-pointer group">
                  <input type="checkbox" checked={formData[key] === 'true'} onChange={(e) => { handleSave(key, e.target.checked ? 'true' : 'false'); setFormData(p => ({ ...p, [key]: e.target.checked ? 'true' : 'false' })); }} className="rounded-md w-4 h-4 border-border text-primary focus:ring-primary/20" />
                  <span className="text-sm text-content group-hover:text-primary transition-colors capitalize">{key.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                </label>
              ))}
            </div>
            <Button className="mt-5" onClick={() => handleSave('tax.rateBps', formData['tax.rateBps'] ?? '850')} leftIcon={<Save className="w-4 h-4" />}>Save Tax</Button>
          </section>
        )}

        {activeTab === 'printer' && (
          <section aria-label="Printer settings">
            <h3 className="text-base font-semibold text-content mb-5">Printer Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Receipt Printer" value={formData['printer.receipt'] ?? ''} onChange={(e) => setFormData(p => ({ ...p, 'printer.receipt': e.target.value }))} placeholder="Default system printer" />
              <Input label="Kitchen Printer" value={formData['printer.kitchen'] ?? ''} onChange={(e) => setFormData(p => ({ ...p, 'printer.kitchen': e.target.value }))} placeholder="Default system printer" />
            </div>
            <Button className="mt-5" onClick={() => handleSave('printer.receipt', formData['printer.receipt'] ?? '')} leftIcon={<Save className="w-4 h-4" />}>Save Printer</Button>
          </section>
        )}

        {activeTab === 'backup' && (
          <section aria-label="Backup settings">
            <h3 className="text-base font-semibold text-content mb-5">Database Backup</h3>
            <p className="text-sm text-content-secondary mb-5">Back up your restaurant data to prevent data loss.</p>
            <div className="flex flex-wrap gap-3">
              <Button leftIcon={<Database className="w-4 h-4" />}>Create Backup</Button>
              <Button variant="outline">Restore Backup</Button>
            </div>
            <p className="text-xs text-content-tertiary mt-4">Backups are stored in the app data folder. Auto-backup runs before migrations.</p>
          </section>
        )}

        {activeTab === 'theme' && (
          <section aria-label="Theme settings">
            <h3 className="text-base font-semibold text-content mb-5">Appearance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Monitor },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => id !== 'system' && toggleTheme?.()}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${theme === id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/30 hover:bg-surface-secondary'}`}>
                  <Icon className={`w-6 h-6 ${theme === id ? 'text-primary' : 'text-content-tertiary'}`} />
                  <span className={`text-sm font-medium ${theme === id ? 'text-primary' : 'text-content-secondary'}`}>{label}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </Card>
    </div>
  );
};
