import React, { useEffect, useState } from 'react';

interface MobileAppShellProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const MobileAppShell: React.FC<MobileAppShellProps> = ({ children, className, title, subtitle, action }) => {
  const [timeLabel, setTimeLabel] = useState(() => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  const [batteryLevel, setBatteryLevel] = useState(82);
  const baseClasses = 'min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto border-x shadow-xl';

  useEffect(() => {
    const timeInterval = window.setInterval(() => {
      setTimeLabel(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    }, 1000 * 30);

    const batteryInterval = window.setInterval(() => {
      setBatteryLevel(prev => Math.max(10, Math.min(100, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 1000 * 60);

    return () => {
      window.clearInterval(timeInterval);
      window.clearInterval(batteryInterval);
    };
  }, []);

  return (
    <div className={`${baseClasses}${className ? ` ${className}` : ''}`}>
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center justify-between px-4 py-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span>{timeLabel}</span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">📶</span>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">🔋 {batteryLevel}%</span>
          </div>
        </div>
        {(title || subtitle || action) && (
          <div className="px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</p>}
                {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
              </div>
              {action && <div className="shrink-0">{action}</div>}
            </div>
          </div>
        )}
      </header>
      {children}
    </div>
  );
};
