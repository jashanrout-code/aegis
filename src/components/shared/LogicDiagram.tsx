import React, { useState } from 'react';
import { generatePrimaryTruthTable, evaluatePrimaryAlarmRule } from '../../logic/gates';
import { Table, Eye, CheckCircle, XCircle } from 'lucide-react';

interface LogicDiagramProps {
  smoke: boolean;
  highTemp: boolean;
  manualEmergency: boolean;
  zoneName?: string;
}

export const LogicDiagram: React.FC<LogicDiagramProps> = ({
  smoke,
  highTemp,
  manualEmergency,
  zoneName = 'Monitored Zone',
}) => {
  const [showTruthTable, setShowTruthTable] = useState(false);
  const evaluation = evaluatePrimaryAlarmRule(smoke, highTemp, manualEmergency);
  const truthTable = generatePrimaryTruthTable();

  return (
    <div className="bg-industrial-900/90 border border-industrial-800 rounded-lg p-4 font-mono select-none">
      <div className="flex items-center justify-between pb-3 border-b border-industrial-800 mb-3">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">
            Combinational Decision Circuit: {zoneName}
          </span>
        </div>
        <button
          onClick={() => setShowTruthTable(!showTruthTable)}
          className="text-[11px] px-2 py-1 rounded bg-industrial-850 hover:bg-industrial-800 text-cyan-400 border border-cyan-500/30 flex items-center space-x-1.5 transition-colors"
        >
          <Table className="w-3 h-3" />
          <span>{showTruthTable ? 'Hide Truth Table' : 'Inspect Truth Table'}</span>
        </button>
      </div>

      {/* Logic Expression Formula */}
      <div className="text-xs text-slate-300 mb-4 bg-industrial-950/80 p-2.5 rounded border border-industrial-800/80 flex items-center justify-between">
        <div>
          <span className="text-slate-400">Function: </span>
          <span className="text-cyan-neon font-bold">E = S ∧ (T ∨ M)</span>
          <span className="text-[10px] text-slate-500 ml-1.5">[A = S ∧ (H ∨ M)]</span>
        </div>
        <div className="text-[11px]">
          <span className="text-slate-400">Current Evaluation: </span>
          <span className={evaluation.alarmOutput ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
            {evaluation.booleanExpression}
          </span>
        </div>
      </div>

      {/* Interactive Circuit Schematic SVG */}
      <div className="relative py-2 bg-industrial-950/50 rounded-lg border border-industrial-800/50 overflow-x-auto flex justify-center">
        <svg viewBox="0 0 540 220" className="w-full max-w-[500px] h-auto text-xs">
          {/* Signal Lines Inputs */}
          {/* S (Smoke) Line */}
          <line x1="40" y1="50" x2="310" y2="50" stroke={smoke ? '#22d3ee' : '#334155'} strokeWidth="3" />
          <circle cx="40" cy="50" r="5" fill={smoke ? '#22d3ee' : '#334155'} />
          <text x="50" y="44" fill={smoke ? '#22d3ee' : '#94a3b8'} fontWeight="bold">S (Smoke): {smoke ? '1' : '0'}</text>

          {/* H (High Temp) Line */}
          <line x1="40" y1="130" x2="160" y2="130" stroke={highTemp ? '#f59e0b' : '#334155'} strokeWidth="3" />
          <circle cx="40" cy="130" r="5" fill={highTemp ? '#f59e0b' : '#334155'} />
          <text x="50" y="124" fill={highTemp ? '#f59e0b' : '#94a3b8'} fontWeight="bold">T (Temp): {highTemp ? '1' : '0'}</text>

          {/* M (Manual Emergency) Line */}
          <line x1="40" y1="180" x2="160" y2="180" stroke={manualEmergency ? '#ef4444' : '#334155'} strokeWidth="3" />
          <circle cx="40" cy="180" r="5" fill={manualEmergency ? '#ef4444' : '#334155'} />
          <text x="50" y="174" fill={manualEmergency ? '#ef4444' : '#94a3b8'} fontWeight="bold">M (Manual): {manualEmergency ? '1' : '0'}</text>

          {/* OR Gate Symbol (Inputs H/T, M) */}
          <g transform="translate(160, 120)">
            <path
              d="M 0 0 C 20 0 45 10 60 30 C 45 50 20 60 0 60 C 15 40 15 20 0 0 Z"
              fill="#0f172a"
              stroke="#64748b"
              strokeWidth="2"
            />
            <text x="18" y="35" fill="#e2e8f0" fontSize="12" fontWeight="bold">OR</text>
          </g>

          {/* Line from OR gate to AND gate input */}
          <line 
            x1="220" y1="150" x2="270" y2="150" 
            stroke={evaluation.intermediateOr ? '#f59e0b' : '#334155'} 
            strokeWidth="3" 
          />
          <line 
            x1="270" y1="150" x2="270" y2="90" 
            stroke={evaluation.intermediateOr ? '#f59e0b' : '#334155'} 
            strokeWidth="3" 
          />
          <line 
            x1="270" y1="90" x2="310" y2="90" 
            stroke={evaluation.intermediateOr ? '#f59e0b' : '#334155'} 
            strokeWidth="3" 
          />
          <text x="235" y="142" fill="#64748b" fontSize="10">({highTemp ? '1' : '0'} ∨ {manualEmergency ? '1' : '0'})</text>

          {/* AND Gate Symbol (Inputs S and OR-output) */}
          <g transform="translate(310, 40)">
            <path
              d="M 0 0 L 30 0 A 30 30 0 0 1 30 60 L 0 60 Z"
              fill="#0f172a"
              stroke="#64748b"
              strokeWidth="2"
            />
            <text x="14" y="35" fill="#e2e8f0" fontSize="12" fontWeight="bold">AND</text>
          </g>

          {/* Output Line E / A */}
          <line 
            x1="370" y1="70" x2="460" y2="70" 
            stroke={evaluation.alarmOutput ? '#ef4444' : '#10b981'} 
            strokeWidth="4" 
          />
          <circle cx="460" cy="70" r="7" fill={evaluation.alarmOutput ? '#ef4444' : '#10b981'} />
          <text 
            x="395" y="60" 
            fill={evaluation.alarmOutput ? '#ef4444' : '#10b981'} 
            fontWeight="bold" 
            fontSize="13"
          >
            Output E: {evaluation.alarmOutput ? '1 (EMERGENCY)' : '0 (CLEAR)'}
          </text>
        </svg>
      </div>

      {/* Collapsible Truth Table Modal / Panel */}
      {showTruthTable && (
        <div className="mt-4 pt-3 border-t border-industrial-800">
          <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span>Verified 8-Row Truth Table (All 2³ Combinations)</span>
            <span className="text-[10px] text-slate-400">Active Row Highlighted</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border border-industrial-800 rounded">
              <thead className="bg-industrial-850 text-slate-300 border-b border-industrial-800">
                <tr>
                  <th className="p-2">Row</th>
                  <th className="p-2">S (Smoke)</th>
                  <th className="p-2">H (Temp)</th>
                  <th className="p-2">M (Manual)</th>
                  <th className="p-2">H ∨ M</th>
                  <th className="p-2">A = S ∧ (H ∨ M)</th>
                  <th className="p-2">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800">
                {truthTable.map((row, idx) => {
                  const isCurrent = row.smoke === smoke && row.highTemp === highTemp && row.manual === manualEmergency;
                  return (
                    <tr
                      key={idx}
                      className={isCurrent ? 'bg-cyan-950/60 font-bold border-l-4 border-cyan-400' : 'hover:bg-industrial-850/40'}
                    >
                      <td className="p-2 text-slate-400">{row.minterm.split(':')[0]}</td>
                      <td className="p-2">{row.smoke ? '1' : '0'}</td>
                      <td className="p-2">{row.highTemp ? '1' : '0'}</td>
                      <td className="p-2">{row.manual ? '1' : '0'}</td>
                      <td className="p-2 text-slate-400">{row.orResult ? '1' : '0'}</td>
                      <td className={`p-2 font-bold ${row.alarmOutput ? 'text-red-400' : 'text-emerald-400'}`}>
                        {row.alarmOutput ? '1' : '0'}
                      </td>
                      <td className="p-2">
                        {row.alarmOutput ? (
                          <span className="text-red-400 flex items-center space-x-1">
                            <XCircle className="w-3 h-3" />
                            <span>STAGE 2 ALARM</span>
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>NORMAL / PRE</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
