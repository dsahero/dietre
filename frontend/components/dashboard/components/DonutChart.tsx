import React, { useState } from 'react';
import { DonutSegment } from '../types';

interface DonutChartProps {
  segments: DonutSegment[];
  audienceLabel?: string;
  audienceValue?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  audienceLabel = 'AUDIENCE',
  audienceValue = '24.8K',
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<DonutSegment | null>(null);

  const size = 260;
  const center = size / 2;
  const outerRadius = 118;
  const innerRadius = 70;

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const createDonutSlicePath = (
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    startAngle: number,
    endAngle: number
  ): string => {
    let sweep = endAngle - startAngle;
    if (sweep < 0) sweep += 360;

    const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
    const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
    const startInner = polarToCartesian(cx, cy, innerR, endAngle);
    const endInner = polarToCartesian(cx, cy, innerR, startAngle);

    const largeArc = sweep > 180 ? 1 : 0;

    return [
      `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
      `L ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
      'Z',
    ].join(' ');
  };

  return (
    <div className="donut-card" id="donut-card-container">
      <div className="donut-chart-wrapper" id="donut-chart-wrapper">
        <svg
          id="donut-svg"
          className="donut-svg"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-label="Audience distribution donut chart"
        >
          <g id="donut-slices-group">
            {segments.map((segment) => {
              const d = createDonutSlicePath(
                center,
                center,
                innerRadius,
                outerRadius,
                segment.startAngle,
                segment.endAngle
              );
              const isHovered = hoveredSegment?.id === segment.id;
              return (
                <path
                  key={segment.id}
                  id={`donut-slice-${segment.id}`}
                  d={d}
                  fill={segment.color}
                  style={{
                    cursor: 'pointer',
                    transition: 'opacity 0.15s ease, filter 0.15s ease',
                    opacity: hoveredSegment && !isHovered ? 0.75 : 1,
                    filter: isHovered ? 'brightness(1.15)' : 'none',
                  }}
                  onMouseEnter={() => setHoveredSegment(segment)}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  <title>{`${segment.label}: ${segment.percentage}`}</title>
                </path>
              );
            })}
          </g>
        </svg>

        {/* Center label & value */}
        <div className="donut-center-content" id="donut-center-cutout">
          <span className="center-label" id="donut-audience-label">
            {hoveredSegment ? hoveredSegment.label.toUpperCase() : audienceLabel}
          </span>
          <span className="center-value" id="donut-audience-total">
            {hoveredSegment ? hoveredSegment.percentage : audienceValue}
          </span>
        </div>
      </div>
    </div>
  );
};
