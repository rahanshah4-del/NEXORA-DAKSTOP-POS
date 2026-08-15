import { Outlet } from 'react-router-dom';
import { IconBar } from '@/components/layout/IconBar';
import { Header } from '@/components/layout/Header';
import { RightPanel } from '@/components/layout/RightPanel';
import { ScrollArea } from '@/components/ui/ScrollArea';

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <IconBar />

      <div className="flex flex-1 flex-col min-w-0 ml-[56px]">
        <Header />

        <main className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full">
            <Outlet />
          </ScrollArea>
        </main>
      </div>

      <RightPanel />
    </div>
  );
}
