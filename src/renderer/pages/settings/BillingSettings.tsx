import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Save, Check } from 'lucide-react';

export default function BillingSettings() {
  const [gst, setGst] = useState('27AABCT1234C1Z5');
  const [fssai, setFssai] = useState('100xxxxxxxxxxxx');
  const [taxRate, setTaxRate] = useState('5');
  const [serviceCharge, setServiceCharge] = useState('0');
  const [prefix, setPrefix] = useState('INV-NEX-');
  const [startNumber, setStartNumber] = useState('1000');
  const [footer, setFooter] = useState('Thank you for dining with us!');
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Billing Configuration</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-4">
          <Input label="GST Number" value={gst} onChange={(e) => setGst(e.target.value)} />
          <Input label="FSSAI License" value={fssai} onChange={(e) => setFssai(e.target.value)} />
          <Select label="Default Tax Rate" options={[
            { value: '5', label: '5% GST' }, { value: '12', label: '12% GST' }, { value: '18', label: '18% GST' },
          ]} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          <Input label="Service Charge (%)" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} type="number" />
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoice Settings</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Invoice Prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          <Input label="Starting Invoice Number" value={startNumber} onChange={(e) => setStartNumber(e.target.value)} type="number" />
          <div className="col-span-2"><Input label="Footer Text" value={footer} onChange={(e) => setFooter(e.target.value)} /></div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button leftIcon={saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} onClick={save}>{saved ? 'Saved!' : 'Save Changes'}</Button>
      </div>
    </div>
  );
}
