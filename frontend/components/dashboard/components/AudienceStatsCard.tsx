import React from 'react';
import { StatMetric } from '../types';

interface AudienceStatsCardProps {
  metrics: StatMetric[];
  title?: string;
}

export const AudienceStatsCard: React.FC<AudienceStatsCardProps> = ({
  metrics,
  title = 'Breakdown & Distribution',
}) => {
  return (
    <div className="audience-stats-card flex flex-col justify-between" id="audience-stats-card">
      <div className="flex items-center justify-between pb-2 border-b border-[#382620] mb-2 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#b8744b]">
          {title}
        </span>
        <span className="text-[10.5px] text-[#8e7e78]">
          Scroll to view all ({metrics.length}) &harr;
        </span>
      </div>

      <div className="stats-items flex-1 overflow-y-auto overflow-x-auto pr-1 pb-1 scrollbar-thin" id="stats-items">
        {metrics.map((metric, index) => (
          <div
            className="stat-item flex items-center justify-between transition-colors hover:bg-white/[0.04] px-2 py-1.5 rounded-lg text-xs min-w-full gap-4"
            id={`stat-item-${index}`}
            key={metric.label}
          >
            <div className="flex items-center gap-2.5 shrink-0">
              {metric.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: metric.color,
                    boxShadow: `0 0 8px ${metric.color}66`,
                  }}
                />
              )}
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="font-bold text-white text-sm" id={`stat-percentage-${index}`}>
                  {metric.percentage}
                </span>
                {metric.count !== undefined && (
                  <span className="text-[10.5px] text-[#9b8b84] font-medium whitespace-nowrap">
                    ({metric.count} {metric.count === 1 ? 'guest' : 'guests'})
                  </span>
                )}
              </div>
            </div>
            <span
              className="stat-label text-right font-medium text-[#dcd1cb] whitespace-nowrap text-[12px] shrink-0"
              id={`stat-label-${index}`}
              title={metric.label}
            >
              {metric.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

