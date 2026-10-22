import React, { useState } from 'react';
import { 
  generatePrimaryTruthTable, 
  evaluateEmergencyLogic, 
  TruthTableRow 
} from '../../logic/gates';
import { 
  Table, 
  CheckCircle, 
  AlertTriangle, 
  RotateCcw, 
  Sliders, 
  Sparkles, 
  ArrowRight,
  Info
} from 'lucide-react';

interface LogicCircuitVisualizerProps {
  smoke: boolean;
  tempHigh: boolean;
  manualEmergency: boolean;
  isInteractive?: boolean;
  onInputChange?: (inputs: { smoke: boolean; tempHigh: boolean; manualEmergency: boolean }) => void;
  zoneName?: string;
  subtitle?: string;
  showTruthTableByDefault?: boolean;
}

export const LogicCircuitVisualizer: React.FC<LogicCircuitVisualizerProps> = ({
  smoke,
  tempHigh,
  manualEmergency,
  isInteractive = false,
  onInputChange,
  zoneName = 'Monitored Zone',
  subtitle,
  showTruthTableByDefault = true,
}) => {
  const [showTruthTable, setShowTruthTable] = useState(showTruthTableByDefault);
  const evaluation = evaluateEmergencyLogic(smoke, tempHigh, manualEmergency);
  const truthTable = generatePrimaryTruthTable();

  const handleToggle = (key: 'smoke' | 'tempHigh' | 'manualEmergency') => {
    if (!isInteractive || !onInputChange) return;
    onInputChange({
      smoke: key === 'smoke' ? !smoke : smoke,
      tempHigh: key === 'tempHigh' ? !tempHigh : tempHigh,
      manualEmergency: key === 'manualEmergency' ? !manualEmergency : manualEmergency,
    });
  };

  const handleRowSelect = (row: TruthTableRow) => {
    if (!isInteractive || !onInputChange) return;
    onInputChange({
      smoke: row.smoke,
      tempHigh: row.temp,
      manualEmergency: row.manual,
    });
  };

  // Signal wire styling
  const wireColor = (active: boolean, colorClass: string = '#22d3ee') => (active ? colorClass : '#334155');
  const wireStroke = (active: boolean) => (active ? '3.5' : '2');

  return (
    <div className="bg-industrial-900 border border-industrial-800 rounded-lg p-4 font-mono select-none space-y-4 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-industrial-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${evaluation.emergencyOutput ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`}></span>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Digital Electronics Circuit: {zoneName}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-industrial-950 border border-industrial-800 text-cyan-400">
              E = S ∧ (T ∨ M)
            </span>
          </div>
          {subtitle && <p className="text-[11px] text-slate-400 font-sans mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center space-x-2">
          {isInteractive && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800 text-amber-300 flex items-center space-x-1">
              <Sliders className="w-3 h-3" />
              <span>Sandbox Interactive</span>
            </span>
          )}
          <button
            onClick={() => setShowTruthTable(!showTruthTable)}
            className="text-[11px] px-2.5 py-1 rounded bg-industrial-850 hover:bg-industrial-800 text-cyan-400 border border-cyan-500/30 flex items-center space-x-1.5 transition-colors"
          >
            <Table className="w-3.5 h-3.5" />
            <span>{showTruthTable ? 'Hide Truth Table' : 'Show Truth Table (8 Rows)'}</span>
          </button>
        </div>
      </div>

      {/* Logic Formula & Evaluation Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        {/* Boolean Function Definition */}
        <div className="p-2.5 rounded bg-industrial-950 border border-industrial-800/80 flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Illustrative Boolean Rule</span>
          <div className="text-cyan-neon font-bold text-sm tracking-wide">
            E = S ∧ (T ∨ M)
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            S = Smoke, T = Temp, M = Manual, E = Emergency
          </div>
        </div>

        {/* Current Evaluation */}
        <div className="p-2.5 rounded bg-industrial-950 border border-industrial-800/80 flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Current Gate Evaluation</span>
          <div className="font-bold text-xs text-slate-200">
            E = {smoke ? '1' : '0'} ∧ ({tempHigh ? '1' : '0'} ∨ {manualEmergency ? '1' : '0'})
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Intermediate OR: (T ∨ M) = <span className={evaluation.intermediateOr ? 'text-amber-400 font-bold' : 'text-slate-500'}>{evaluation.intermediateOr ? '1' : '0'}</span>
          </div>
        </div>

        {/* Output Decision Result */}
        <div className={`p-2.5 rounded border flex flex-col justify-center transition-all ${
          evaluation.emergencyOutput 
            ? 'bg-red-950/50 border-red-800/80 text-red-200' 
            : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
        }`}>
          <span className="text-[10px] opacity-75 uppercase tracking-wider">Calculated Output E</span>
          <div className="text-sm font-extrabold flex items-center space-x-1.5">
            <span>{evaluation.emergencyOutput ? 'E = 1 (EMERGENCY ALARM)' : 'E = 0 (CONDITIONS NOMINAL)'}</span>
          </div>
          <div className="text-[10px] opacity-80 mt-0.5">
            {evaluation.emergencyOutput ? 'Trip Klaxon & Evacuation Stage 2' : 'No emergency confluence detected'}
          </div>
        </div>
      </div>

      {/* Interactive Input Toggle Controls (if interactive) */}
      {isInteractive && (
        <div className="p-3 bg-industrial-950/70 border border-industrial-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-bold">Input Toggles:</span>
            <span className="text-[10px] text-slate-500">(Click to toggle binary inputs 0 ↔ 1)</span>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* S Toggle */}
            <button
              onClick={() => handleToggle('smoke')}
              className={`px-3 py-1.5 rounded font-bold border transition-all flex items-center space-x-1.5 ${
                smoke 
                  ? 'bg-cyan-500 text-industrial-950 border-cyan-400 shadow-md shadow-cyan-500/20' 
                  : 'bg-industrial-850 text-slate-400 border-industrial-700 hover:text-white'
              }`}
            >
              <span>S (Smoke):</span>
              <span className="font-mono text-sm">{smoke ? '1' : '0'}</span>
            </button>

            {/* T Toggle */}
            <button
              onClick={() => handleToggle('tempHigh')}
              className={`px-3 py-1.5 rounded font-bold border transition-all flex items-center space-x-1.5 ${
                tempHigh 
                  ? 'bg-amber-500 text-industrial-950 border-amber-400 shadow-md shadow-amber-500/20' 
                  : 'bg-industrial-850 text-slate-400 border-industrial-700 hover:text-white'
              }`}
            >
              <span>T (Temp):</span>
              <span className="font-mono text-sm">{tempHigh ? '1' : '0'}</span>
            </button>

            {/* M Toggle */}
            <button
              onClick={() => handleToggle('manualEmergency')}
              className={`px-3 py-1.5 rounded font-bold border transition-all flex items-center space-x-1.5 ${
                manualEmergency 
                  ? 'bg-red-500 text-white border-red-400 shadow-md shadow-red-500/20' 
                  : 'bg-industrial-850 text-slate-400 border-industrial-700 hover:text-white'
              }`}
            >
              <span>M (Manual):</span>
              <span className="font-mono text-sm">{manualEmergency ? '1' : '0'}</span>
            </button>

            {/* Reset to 000 */}
            <button
              onClick={() => onInputChange && onInputChange({ smoke: false, tempHigh: false, manualEmergency: false })}
              className="px-2.5 py-1.5 rounded bg-industrial-900 hover:bg-industrial-800 border border-industrial-700 text-slate-300 text-[11px] flex items-center space-x-1 transition-colors"
              title="Reset all inputs to 0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset 000</span>
            </button>
          </div>
        </div>
      )}

      {/* SVG Circuit Schematic */}
      <div className="relative py-3 bg-industrial-950 rounded-lg border border-industrial-800 overflow-x-auto flex justify-center">
        <svg viewBox="0 0 620 250" className="w-full max-w-[580px] h-auto text-xs">
          <defs>
            {/* Cyan Glow for S */}
            <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Amber Glow for OR */}
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Red Glow for Output Emergency */}
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid background subtle effect */}
          <line x1="0" y1="60" x2="620" y2="60" stroke="#0f172a" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="140" x2="620" y2="140" stroke="#0f172a" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="200" x2="620" y2="200" stroke="#0f172a" strokeWidth="1" strokeDasharray="4 4" />

          {/* INPUT 1: S (Smoke) Line to AND Gate input */}
          <g>
            <circle cx="50" cy="60" r="7" fill={smoke ? '#22d3ee' : '#1e293b'} stroke="#64748b" strokeWidth="2" />
            <text x="65" y="55" fill={smoke ? '#22d3ee' : '#94a3b8'} fontWeight="bold" fontSize="12">
              S (Smoke): {smoke ? 'HIGH (1)' : 'LOW (0)'}
            </text>
            <line
              x1="57"
              y1="60"
              x2="350"
              y2="60"
              stroke={wireColor(smoke, '#22d3ee')}
              strokeWidth={wireStroke(smoke)}
              filter={smoke ? 'url(#glowCyan)' : undefined}
            />
          </g>

          {/* INPUT 2: T (High Temperature) Line to OR Gate input 1 */}
          <g>
            <circle cx="50" cy="140" r="7" fill={tempHigh ? '#f59e0b' : '#1e293b'} stroke="#64748b" strokeWidth="2" />
            <text x="65" y="135" fill={tempHigh ? '#f59e0b' : '#94a3b8'} fontWeight="bold" fontSize="12">
              T (Temp): {tempHigh ? 'HIGH (1)' : 'LOW (0)'}
            </text>
            <line
              x1="57"
              y1="140"
              x2="190"
              y2="140"
              stroke={wireColor(tempHigh, '#f59e0b')}
              strokeWidth={wireStroke(tempHigh)}
              filter={tempHigh ? 'url(#glowAmber)' : undefined}
            />
          </g>

          {/* INPUT 3: M (Manual Emergency Pull) Line to OR Gate input 2 */}
          <g>
            <circle cx="50" cy="200" r="7" fill={manualEmergency ? '#ef4444' : '#1e293b'} stroke="#64748b" strokeWidth="2" />
            <text x="65" y="195" fill={manualEmergency ? '#ef4444' : '#94a3b8'} fontWeight="bold" fontSize="12">
              M (Manual): {manualEmergency ? 'HIGH (1)' : 'LOW (0)'}
            </text>
            <line
              x1="57"
              y1="200"
              x2="190"
              y2="200"
              stroke={wireColor(manualEmergency, '#ef4444')}
              strokeWidth={wireStroke(manualEmergency)}
              filter={manualEmergency ? 'url(#glowRed)' : undefined}
            />
          </g>

          {/* OR Gate Symbol (Inputs: T and M) */}
          <g transform="translate(190, 130)">
            <path
              d="M 0 0 C 25 0 55 15 75 40 C 55 65 25 80 0 80 C 20 55 20 25 0 0 Z"
              fill="#090d16"
              stroke={evaluation.intermediateOr ? '#f59e0b' : '#475569'}
              strokeWidth="2.5"
            />
            <text x="24" y="45" fill="#f8fafc" fontSize="13" fontWeight="bold">OR</text>
            <text x="-15" y="-6" fill="#64748b" fontSize="10">Gate 1: (T ∨ M)</text>
          </g>

          {/* OR Gate Output Line -> AND Gate Input 2 */}
          <g>
            {/* Horizontal from OR output */}
            <line
              x1="265"
              y1="170"
              x2="310"
              y2="170"
              stroke={wireColor(evaluation.intermediateOr, '#f59e0b')}
              strokeWidth={wireStroke(evaluation.intermediateOr)}
              filter={evaluation.intermediateOr ? 'url(#glowAmber)' : undefined}
            />
            {/* Vertical up towards AND input */}
            <line
              x1="310"
              y1="170"
              x2="310"
              y2="100"
              stroke={wireColor(evaluation.intermediateOr, '#f59e0b')}
              strokeWidth={wireStroke(evaluation.intermediateOr)}
              filter={evaluation.intermediateOr ? 'url(#glowAmber)' : undefined}
            />
            {/* Horizontal into AND gate bottom terminal */}
            <line
              x1="310"
              y1="100"
              x2="350"
              y2="100"
              stroke={wireColor(evaluation.intermediateOr, '#f59e0b')}
              strokeWidth={wireStroke(evaluation.intermediateOr)}
              filter={evaluation.intermediateOr ? 'url(#glowAmber)' : undefined}
            />
            <text x="272" y="162" fill={evaluation.intermediateOr ? '#f59e0b' : '#64748b'} fontSize="10">
              ({tempHigh ? '1' : '0'} ∨ {manualEmergency ? '1' : '0'} = {evaluation.intermediateOr ? '1' : '0'})
            </text>
          </g>

          {/* AND Gate Symbol (Inputs: S and (T OR M)) */}
          <g transform="translate(350, 45)">
            <path
              d="M 0 0 L 35 0 A 35 35 0 0 1 35 70 L 0 70 Z"
              fill="#090d16"
              stroke={evaluation.emergencyOutput ? '#ef4444' : '#475569'}
              strokeWidth="2.5"
            />
            <text x="16" y="42" fill="#f8fafc" fontSize="13" fontWeight="bold">AND</text>
            <text x="-5" y="-8" fill="#64748b" fontSize="10">Gate 2: S ∧ (T ∨ M)</text>
          </g>

          {/* Output Line E: From AND gate to Output Indicator */}
          <g>
            <line
              x1="420"
              y1="80"
              x2="520"
              y2="80"
              stroke={evaluation.emergencyOutput ? '#ef4444' : '#10b981'}
              strokeWidth={evaluation.emergencyOutput ? '4' : '3'}
              filter={evaluation.emergencyOutput ? 'url(#glowRed)' : undefined}
            />
            <circle
              cx="520"
              cy="80"
              r="9"
              fill={evaluation.emergencyOutput ? '#ef4444' : '#10b981'}
              stroke="#0f172a"
              strokeWidth="2"
            />
            <text
              x="440"
              y="68"
              fill={evaluation.emergencyOutput ? '#ef4444' : '#10b981'}
              fontWeight="bold"
              fontSize="13"
            >
              Output E: {evaluation.emergencyOutput ? '1 (EMERGENCY)' : '0 (CLEAR)'}
            </text>
            <text
              x="535"
              y="85"
              fill={evaluation.emergencyOutput ? '#f87171' : '#34d399'}
              fontSize="11"
              fontWeight="bold"
            >
              {evaluation.emergencyOutput ? 'ALARM STAGE 2' : 'NOMINAL'}
            </text>
          </g>
        </svg>
      </div>

      {/* Truth Table Panel */}
      {showTruthTable && (
        <div className="pt-3 border-t border-industrial-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              Verified 8-Row Truth Table for Function: <span className="text-cyan-neon">E = S ∧ (T ∨ M)</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Active Input Vector Highlighted In Cyan/Red
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border border-industrial-800 rounded">
              <thead className="bg-industrial-950 text-slate-300 border-b border-industrial-800">
                <tr>
                  <th className="p-2">Row</th>
                  <th className="p-2">S (Smoke)</th>
                  <th className="p-2">T (Temp)</th>
                  <th className="p-2">M (Manual)</th>
                  <th className="p-2 text-slate-400">T ∨ M</th>
                  <th className="p-2 text-cyan-400 font-bold">E = S ∧ (T ∨ M)</th>
                  <th className="p-2">Controller Impact</th>
                  {isInteractive && <th className="p-2 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800 font-mono">
                {truthTable.map((row) => {
                  const isCurrent = row.smoke === smoke && row.temp === tempHigh && row.manual === manualEmergency;
                  return (
                    <tr
                      key={row.rowNumber}
                      onClick={() => isInteractive && handleRowSelect(row)}
                      className={`transition-colors ${
                        isCurrent 
                          ? 'bg-cyan-950/70 border-l-4 border-cyan-400 font-bold text-white' 
                          : 'hover:bg-industrial-850/50 text-slate-400'
                      } ${isInteractive ? 'cursor-pointer' : ''}`}
                    >
                      <td className="p-2 text-slate-400">
                        {row.minterm.split(':')[0]} ({row.rowNumber})
                      </td>
                      <td className={`p-2 ${row.smoke ? 'text-cyan-300 font-bold' : 'text-slate-500'}`}>
                        {row.smoke ? '1' : '0'}
                      </td>
                      <td className={`p-2 ${row.temp ? 'text-amber-300 font-bold' : 'text-slate-500'}`}>
                        {row.temp ? '1' : '0'}
                      </td>
                      <td className={`p-2 ${row.manual ? 'text-red-300 font-bold' : 'text-slate-500'}`}>
                        {row.manual ? '1' : '0'}
                      </td>
                      <td className="p-2 text-slate-400">
                        {row.orResult ? '1' : '0'}
                      </td>
                      <td className={`p-2 font-bold ${row.emergencyOutput ? 'text-red-400' : 'text-emerald-400'}`}>
                        {row.emergencyOutput ? '1' : '0'}
                      </td>
                      <td className="p-2">
                        {row.emergencyOutput ? (
                          <span className="text-red-400 flex items-center space-x-1 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            <span>EMERGENCY (STAGE 2)</span>
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>NOMINAL / PRE-ALARM</span>
                          </span>
                        )}
                      </td>
                      {isInteractive && (
                        <td className="p-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowSelect(row);
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                              isCurrent
                                ? 'bg-cyan-500 text-industrial-950 font-bold'
                                : 'bg-industrial-850 text-slate-300 hover:bg-industrial-800'
                            }`}
                          >
                            {isCurrent ? 'Active' : 'Test Row'}
                          </button>
                        </td>
                      )}
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
