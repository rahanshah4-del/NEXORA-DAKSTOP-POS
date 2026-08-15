import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Tooltip } from '@/components/ui/Tooltip';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  label: string;
  path: string;
  icon: LucideIcon;
  collapsed: boolean;
  children?: { label: string; path: string }[];
  onNavigate?: () => void;
}

export function SidebarItem({
  label,
  path,
  icon: Icon,
  collapsed,
  children,
  onNavigate,
}: SidebarItemProps) {
  const [expanded, setExpanded] = useState(false);

  if (children && children.length > 0) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-150 group',
            'text-sidebar-text hover:text-sidebar-text-active hover:bg-sidebar-hover',
          )}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left font-medium truncate">{label}</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  expanded && 'rotate-180',
                )}
              />
            </>
          )}
        </button>
        {!collapsed && expanded && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-active pl-4">
            {children.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-1.5 text-sm rounded-md transition-colors duration-150',
                    'text-sidebar-text hover:text-sidebar-text-active hover:bg-sidebar-hover',
                    isActive && 'text-sidebar-text-active bg-sidebar-active',
                  )
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Tooltip content={label} side="right" delay={600}>
      <NavLink
        to={path}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-150 group',
            'text-sidebar-text hover:text-sidebar-text-active hover:bg-sidebar-hover',
            isActive && 'text-sidebar-text-active bg-sidebar-active border-l-2 border-sidebar-accent',
            collapsed && 'px-2 justify-center',
          )
        }
      >
        <Icon className="h-5 w-5 flex-shrink-0 transition-transform duration-150 group-hover:scale-105" />
        {!collapsed && <span className="font-medium truncate">{label}</span>}
      </NavLink>
    </Tooltip>
  );
}
