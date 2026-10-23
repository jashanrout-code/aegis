import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  Clock, 
  Activity, 
  Sliders, 
  StepForward,
  Layers,
  Info
} from 'lucide-react';
import { TimingSignalSample, FSMState } from '../../types/simulation';
import { simulationStore } from '../../engine/simulationStore';

interface TimingDiagramViewerProps {
  timingHistory: TimingSignalSample[];
  clockRunning: boolean;
  clockFrequency: number;
  currentClock: boolean;
  sequentialRegisterQ: boolean;
  fsmState: FSMState;
}

export const TimingDiagramViewer: React.FC<TimingDiagramViewerProps> = ({
  timingHistory,
  clockRunning,
  clockFrequency,
  currentClock,
  sequentialRegisterQ,
  fsmState,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG Waveform Plotting Geometry
  const width = 760;
  const channelHeight = 36;
  const topPadding = 24;
  const leftPadding = 120;
  const rightPadding = 24;
  const plotWidth = width - leftPadding - rightPadding;

  const samples = timingHistory.length > 0 ? timingHistory : [
    {
      id: 'mock-0',
      timestamp: 0,
      clock: false,
      inputA: false,
      inputB: false,
      smoke: false,
      tempHigh: false,
      manualEmergency: false,
      nandOut: true,
      norOut: true,
      selectedCombOut: false,
      primaryAlarmOut: false,
      fsmState: 'NORMAL' as FSMState,
      sequentialRegisterQ: false,
    }
  ];

  const totalPoints = samples.length;
  const stepX = totalPoints > 1 ? plotWidth / (totalPoints - 1) : plotWidth;

  const channels: { id: string; label: string; color: string; getValue: (s: TimingSignalSample) => boolean }[] = [
    { id: 'CLK', label: 'Clock (CLK)', color: '#38bdf8', getValue: (s) => s.clock },
    { id: 'IN_A', label: 'Input A (Smoke S)', color: '#00f0ff', getValue: (s) => s.inputA },
    { id: 'IN_B', label: 'Input B (Temp T)', color: '#f59e0b', getValue: (s) => s.inputB },
    { id: 'IN_M', label: 'Manual Alarm (M)', color: '#ef4444', getValue: (s) => s.manualEmergency },
    { id: 'NAND', label: 'NAND (A·B)\'', color: '#a855f7', getValue: (s) => s.nandOut },
    { id: 'NOR', label: 'NOR (A+B)\'', color: '#ec4899', getValue: (s) => s.norOut },
    { id: 'COMB_OR', label: 'NAND-OR (A+B)', color: '#3b82f6', getValue: (s) => s.selectedCombOut },
    { id: 'ALARM_E', label: 'Alarm E=S·(T+M)', color: '#ef4444', getValue: (s) => s.primaryAlarmOut },
    { id: 'REG_Q', label: 'Sequential FF (Q)', color: '#10b981', getValue: (s) => s.sequentialRegisterQ },
  ];

  const totalHeight = topPadding + channels.length * channelHeight + 30;

  // Generate square-wave SVG path for each digital channel
  const renderSquareWave = (getValue: (s: TimingSignalSample) => boolean, strokeColor: string, yBase: number) => {
    if (samples.length === 0) return null;

    const highY = yBase + 4;
    const lowY = yBase + channelHeight - 8;

    let pathD = '';
    samples.forEach((sample, i) => {
      const x = leftPadding + i * stepX;
      const isHigh = getValue(sample);
      const y = isHigh ? highY : lowY;

      if (i === 0) {
        pathD += `M ${x} ${y}`;
      } else {
        const prevSample = samples[i - 1];
        const wasHigh = getValue(prevSample);
        const prevX = leftPadding + (i - 1) * stepX;

        if (wasHigh !== isHigh) {
          // Horizontal step up to transition, then vertical edge, then horizontal step
          pathD += ` L ${x} ${wasHigh ? highY : lowY} L ${x} ${y}`;
        } else {
          pathD += ` L ${x} ${y}`;
        }
      }
    });

    return (
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  const hoveredSample = hoveredIndex !== null && samples[hoveredIndex] ? samples[hoveredIndex] : null;

  return (
    <div className="bg-industrial-900 border border-industrial-800 rounded-lg p-5 font-mono select-none space-y-4 shadow-xl">
      {/* Viewer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-industrial-800">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Live Digital Timing Diagram & Clock Oscilloscope
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-bold">
              MULTI-CHANNEL DIGITAL ANALYZER
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Real-time digital signal transitions, clock pulses, combinational propagation, and sequential register states.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Clock Run/Pause */}
          <button
            onClick={() => simulationStore.toggleClockRunning()}
            className={`px-2.5 py-1 text-xs rounded font-bold flex items-center space-x-1.5 transition-colors ${
              clockRunning
                ? 'bg-amber-500 text-industrial-950 shadow-sm'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {clockRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{clockRunning ? 'Pause Clock' : 'Run Clock'}</span>
          </button>

          {/* Single Step Pulse */}
          <button
            onClick={() => simulationStore.singleStepClockPulse()}
            className="px-2.5 py-1 text-xs rounded bg-industrial-950 hover:bg-industrial-850 text-cyan-300 border border-industrial-800 flex items-center space-x-1 transition-colors"
            title="Generate a single clock pulse (0 -> 1 -> 0) and evaluate sequential logic"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>Single Step</span>
          </button>

          {/* Clear History */}
          <button
            onClick={() => simulationStore.clearTimingHistory()}
            className="px-2.5 py-1 text-xs rounded bg-industrial-950 hover:bg-industrial-850 text-slate-400 hover:text-slate-200 border border-industrial-800 flex items-center space-x-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Trace</span>
          </button>
        </div>
      </div>

      {/* Frequency & Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded bg-industrial-950 border border-industrial-800">
          <span className="text-[10px] text-slate-500 uppercase block font-bold">Clock Oscillator</span>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${currentClock ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : 'bg-slate-600'}`}></span>
            <span className="font-bold text-slate-200">{currentClock ? 'HIGH (1)' : 'LOW (0)'}</span>
            <span className="text-[10px] text-slate-400">({clockRunning ? 'Ticking' : 'Halted'})</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-industrial-950 border border-industrial-800">
          <span className="text-[10px] text-slate-500 uppercase block font-bold">Sequential Register Q</span>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${sequentialRegisterQ ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
            <span className="font-bold text-slate-200">Q = {sequentialRegisterQ ? '1 (LATCHED)' : '0 (RESET)'}</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-industrial-950 border border-industrial-800">
          <span className="text-[10px] text-slate-500 uppercase block font-bold">Clock Frequency</span>
          <div className="flex items-center space-x-1 mt-0.5">
            {[0.5, 1.0, 2.0].map((freq) => (
              <button
                key={freq}
                onClick={() => simulationStore.setClockFrequency(freq)}
                className={`px-1.5 py-0.5 text-[10px] rounded ${
                  clockFrequency === freq
                    ? 'bg-cyan-500 text-industrial-950 font-bold'
                    : 'bg-industrial-900 text-slate-400 hover:text-white'
                }`}
              >
                {freq}Hz
              </button>
            ))}
          </div>
        </div>

        <div className="p-2.5 rounded bg-industrial-950 border border-industrial-800">
          <span className="text-[10px] text-slate-500 uppercase block font-bold">Recorded History</span>
          <div className="font-bold text-slate-200 mt-0.5">
            {samples.length} Transition Samples
          </div>
        </div>
      </div>

      {/* Timing Waveform Display (SVG) */}
      <div className="bg-industrial-950 rounded-lg border border-industrial-800 p-2 overflow-x-auto">
        <svg 
          viewBox={`0 0 ${width} ${totalHeight}`} 
          className="w-full min-w-[700px] h-auto text-xs"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Grid Background lines */}
          {channels.map((ch, idx) => {
            const yBase = topPadding + idx * channelHeight;
            return (
              <g key={ch.id}>
                {/* Channel divider line */}
                <line 
                  x1={leftPadding} 
                  y1={yBase + channelHeight} 
                  x2={width - rightPadding} 
                  y2={yBase + channelHeight} 
                  stroke="#1e293b" 
                  strokeDasharray="2 4" 
                />
                {/* Channel Label */}
                <text 
                  x={leftPadding - 10} 
                  y={yBase + channelHeight / 2 + 3} 
                  fill={ch.color} 
                  textAnchor="end" 
                  fontSize="10" 
                  fontWeight="bold"
                >
                  {ch.label}
                </text>

                {/* Sub-level markers (0, 1) */}
                <text x={leftPadding - 2} y={yBase + 9} fill="#475569" textAnchor="end" fontSize="8">1</text>
                <text x={leftPadding - 2} y={yBase + channelHeight - 7} fill="#475569" textAnchor="end" fontSize="8">0</text>
              </g>
            );
          })}

          {/* Vertical Time Grid Columns */}
          {samples.map((s, i) => {
            const x = leftPadding + i * stepX;
            return (
              <line
                key={i}
                x1={x}
                y1={topPadding}
                x2={x}
                y2={topPadding + channels.length * channelHeight}
                stroke="#172554"
                strokeWidth="0.5"
                opacity="0.3"
              />
            );
          })}

          {/* Render digital square waveforms for each channel */}
          {channels.map((ch, idx) => {
            const yBase = topPadding + idx * channelHeight;
            return (
              <g key={`wave-${ch.id}`}>
                {renderSquareWave(ch.getValue, ch.color, yBase)}
              </g>
            );
          })}

          {/* Latest Simulation Event Cursor */}
          {samples.length > 0 && (
            <g>
              <line
                x1={leftPadding + (samples.length - 1) * stepX}
                y1={topPadding - 8}
                x2={leftPadding + (samples.length - 1) * stepX}
                y2={topPadding + channels.length * channelHeight + 6}
                stroke="#00f0ff"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={leftPadding + (samples.length - 1) * stepX}
                cy={topPadding - 8}
                r="3"
                fill="#00f0ff"
              />
              <text
                x={leftPadding + (samples.length - 1) * stepX}
                y={topPadding - 12}
                fill="#00f0ff"
                fontSize="9"
                textAnchor="middle"
                fontWeight="bold"
              >
                LIVE HEAD
              </text>
            </g>
          )}

          {/* Interactive Hover Inspection Line */}
          {hoveredIndex !== null && samples[hoveredIndex] && (
            <g>
              <line
                x1={leftPadding + hoveredIndex * stepX}
                y1={topPadding}
                x2={leftPadding + hoveredIndex * stepX}
                y2={topPadding + channels.length * channelHeight}
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Invisible interactive hover rects */}
          {samples.map((s, i) => {
            const x = leftPadding + i * stepX - stepX / 2;
            return (
              <rect
                key={`hit-${i}`}
                x={x}
                y={topPadding}
                width={stepX}
                height={channels.length * channelHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIndex(i)}
              />
            );
          })}

          {/* Bottom Time Axis */}
          <line
            x1={leftPadding}
            y1={topPadding + channels.length * channelHeight}
            x2={width - rightPadding}
            y2={topPadding + channels.length * channelHeight}
            stroke="#475569"
            strokeWidth="1"
          />
          <text
            x={leftPadding}
            y={topPadding + channels.length * channelHeight + 16}
            fill="#64748b"
            fontSize="9"
          >
            t = 0s
          </text>
          <text
            x={width - rightPadding}
            y={topPadding + channels.length * channelHeight + 16}
            fill="#64748b"
            fontSize="9"
            textAnchor="end"
          >
            t = {samples[samples.length - 1]?.timestamp ?? 0}s (Current Time)
          </text>
        </svg>
      </div>

      {/* Hover Inspection Signal Probe Box */}
      {hoveredSample && (
        <div className="p-3 rounded bg-industrial-950 border border-amber-800/80 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-amber-400 font-bold">
            <Info className="w-4 h-4" />
            <span>Inspection Probe at t = {hoveredSample.timestamp}s:</span>
          </div>

          <div className="flex flex-wrap gap-3 text-[11px]">
            <span className="text-slate-300">
              CLK: <b className={hoveredSample.clock ? 'text-cyan-400' : 'text-slate-500'}>{hoveredSample.clock ? '1' : '0'}</b>
            </span>
            <span className="text-slate-300">
              In A: <b className={hoveredSample.inputA ? 'text-cyan-400' : 'text-slate-500'}>{hoveredSample.inputA ? '1' : '0'}</b>
            </span>
            <span className="text-slate-300">
              In B: <b className={hoveredSample.inputB ? 'text-amber-400' : 'text-slate-500'}>{hoveredSample.inputB ? '1' : '0'}</b>
            </span>
            <span className="text-slate-300">
              NAND: <b className={hoveredSample.nandOut ? 'text-purple-400' : 'text-slate-500'}>{hoveredSample.nandOut ? '1' : '0'}</b>
            </span>
            <span className="text-slate-300">
              NOR: <b className={hoveredSample.norOut ? 'text-pink-400' : 'text-slate-500'}>{hoveredSample.norOut ? '1' : '0'}</b>
            </span>
            <span className="text-slate-300">
              Alarm E: <b className={hoveredSample.primaryAlarmOut ? 'text-red-400' : 'text-slate-500'}>{hoveredSample.primaryAlarmOut ? '1' : '0'}</b>
            </span>
            <span className="text-slate-300">
              FF Q: <b className={hoveredSample.sequentialRegisterQ ? 'text-emerald-400' : 'text-slate-500'}>{hoveredSample.sequentialRegisterQ ? '1' : '0'}</b>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
