import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { Globe } from 'lucide-react';
import nexoraLogo from '@/assets/icons/nexora-logo-64.png';

const info = [
  { label: 'Version', value: '1.0.0' },
  { label: 'Electron', value: 'v33.2.0' },
  { label: 'React', value: 'v18.3.1' },
  { label: 'Database', value: 'SQLite (better-sqlite3)' },
  { label: 'Cloud', value: 'Firebase Firestore' },
  { label: 'Platform', value: 'Windows (x64)' },
  { label: 'License', value: 'Commercial' },
];

export default function About() {
  return (
    <div className="space-y-6">
      <Card>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-4 overflow-hidden">
            <img src={nexoraLogo} alt="Nexora Solution" className="h-16 w-16 object-contain" />
          </div>
          <h2 className="text-xl font-bold text-content">Nexora Solution</h2>
          <p className="text-sm text-content-secondary mt-1">Enterprise Restaurant POS</p>
          <p className="text-xs text-content-tertiary mt-0.5">Smart Business Solutions</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge variant="info">v1.0.0</Badge>
            <Badge variant="success" dot>Running</Badge>
          </div>
        </div>

        <Separator />

        <div className="px-6 py-4 space-y-2">
          {info.map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-content-secondary">{item.label}</span>
              <span className="text-sm font-medium text-content">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legal</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <p className="text-sm text-content-secondary">
            &copy; {new Date().getFullYear()} Nexora Solution. All rights reserved.
          </p>
          <p className="text-sm text-content-secondary">
            This software is licensed under a commercial proprietary license. Unauthorized
            reproduction, distribution, or use is prohibited.
          </p>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <a
          href="https://nexorasolution.online"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-content-secondary hover:text-content transition-colors"
        >
          <Globe className="h-4 w-4" /> Website
        </a>
        <a
          href="mailto:support@nexorasolution.online"
          className="inline-flex items-center gap-1.5 text-sm text-content-secondary hover:text-content transition-colors"
        >
          <Globe className="h-4 w-4" /> Support
        </a>
      </div>
    </div>
  );
}
