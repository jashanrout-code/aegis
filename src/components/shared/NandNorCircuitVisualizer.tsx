import React, { useState } from 'react';
import { 
  evaluateNandGate, 
  evaluateNorGate, 
  evaluateNandOnlyOr, 
  evaluateNorOnlyAnd, 
  generateUniversalTruthTable,
  UniversalGateEvaluation,
  UniversalTruthTableRow
} from '../../logic/gates';
import { 
  Table, 
  Sliders, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight
} from 'lucide-react';

type CircuitMode = 'NAND_GATE' | 'NOR_GATE' | 'NAND_ONLY_OR' | 'NOR_ONLY_AND';

export const NandNorCircuitVisualizer: React.FC = () => {
  const [mode, setMode] = useState<CircuitMode>('NAND_ONLY_OR');
  const [inputA, setInputA] = useState<boolean>(false);
  const [inputB, setInputB] = useState<boolean>(true);

  // Evaluate current circuit
  let evaluation: UniversalGateEvaluation;
  switch (mode) {
    case 'NAND_GATE':
      evaluation = evaluateNandGate(inputA, inputB);
      break;
    case 'NOR_GATE':
      evaluation = evaluateNorGate(inputA, inputB);
      break;
    case 'NAND_ONLY_OR':
      evaluation = evaluateNandOnlyOr(inputA, inputB);
      break;
    case 'NOR_ONLY_AND':
      evaluation = evaluateNorOnlyAnd(inputA, inputB);
      break;
  }

  const truthTable = generateUniversalTruthTable(mode);
  const currentRowIndex = ((inputA ? 1 : 0) << 1) | (inputB ? 1 : 0);

  const handleReset = () => {
    setInputA(false);
    setInputB(false);
  };

  const wireColor = (active: boolean | undefined, defaultClass: string = '#00f0ff') => {
    return active ? defaultClass : '#334155';
  };

  return (
    <div className="bg-industrial-900 border border-industrial-800 rounded-lg p-5 font-mono select-none space-y-5 shadow-xl">
      {/* Visualizer Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-industrial-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Universal Gates & Equivalent Circuit Synthesis
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-bold">
              DE MORGAN THEOREM
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Demonstrating universal logic completeness: NAND-only and NOR-only canonical equivalence circuits.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="px-2.5 py-1 text-xs rounded bg-industrial-950 hover:bg-industrial-850 text-slate-300 border border-industrial-800 flex items-center space-x-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Inputs</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { id: 'NAND_ONLY_OR', label: 'NAND-Only OR Gate (De Morgan)' },
          { id: 'NOR_ONLY_AND', label: 'NOR-Only AND Gate (De Morgan)' },
          { id: 'NAND_GATE', label: 'Standard 2-Input NAND Gate' },
          { id: 'NOR_GATE', label: 'Standard 2-Input NOR Gate' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setMode(item.id as CircuitMode)}
            className={`px-3 py-1.5 rounded-md font-bold transition-all text-[11px] ${
              mode === item.id
                ? 'bg-cyan-500 text-industrial-950 shadow-md shadow-cyan-500/20'
                : 'bg-industrial-950 text-slate-400 hover:text-slate-200 border border-industrial-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Logic Formula & Mathematical Proof Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded bg-industrial-950 border border-industrial-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Boolean Formulation</span>
          <div className="text-cyan-400 font-bold text-sm tracking-wide">
            {evaluation.formula}
          </div>
          <div className="text-[10px] text-slate-400">
            {mode === 'NAND_ONLY_OR' ? 'OR synthesized purely from 3 NAND gates' :
             mode === 'NOR_ONLY_AND' ? 'AND synthesized purely from 3 NOR gates' :
             'Single primitive universal logic gate'}
          </div>
        </div>

        <div className="p-3 rounded bg-industrial-950 border border-industrial-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">De Morgan Equivalence Proof</span>
          <div className="text-xs text-amber-300 font-bold">
            {evaluation.deMorganProof}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Mathematically identical truth table verified</span>
          </div>
        </div>

        <div className={`p-3 rounded border flex flex-col justify-between transition-all ${
          evaluation.output 
            ? 'bg-cyan-950/40 border-cyan-800/80 text-cyan-200' 
            : 'bg-industrial-950 border-industrial-800 text-slate-400'
        }`}>
          <div>
            <span className="text-[10px] opacity-75 uppercase font-bold tracking-wider">Circuit Output Y</span>
            <div className="text-base font-extrabold flex items-center space-x-2 mt-0.5">
              <span className={`w-2.5 h-2.5 rounded-full ${evaluation.output ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : 'bg-slate-600'}`}></span>
              <span>Y = {evaluation.output ? '1 (HIGH)' : '0 (LOW)'}</span>
            </div>
          </div>
          <div className="text-[10px] opacity-80 mt-1">
            Matches standard function: {evaluation.standardEquivalentOutput ? '1 (HIGH)' : '0 (LOW)'}
          </div>
        </div>
      </div>

      {/* Interactive 0/1 Toggle Switches */}
      <div className="p-3 rounded-lg bg-industrial-950 border border-industrial-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-6 text-xs">
          <span className="text-slate-400 font-bold uppercase text-[11px]">Interactive Signal Switches:</span>
          
          {/* Input A Switch */}
          <div className="flex items-center space-x-2.5">
            <span className="text-slate-300 font-bold">Input A:</span>
            <button
              onClick={() => setInputA(!inputA)}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center space-x-1.5 ${
                inputA 
                  ? 'bg-cyan-500 text-industrial-950 shadow-md shadow-cyan-500/30' 
                  : 'bg-industrial-900 text-slate-400 border border-industrial-700'
              }`}
            >
              <span>{inputA ? 'HIGH (1)' : 'LOW (0)'}</span>
            </button>
          </div>

          {/* Input B Switch */}
          <div className="flex items-center space-x-2.5">
            <span className="text-slate-300 font-bold">Input B:</span>
            <button
              onClick={() => setInputB(!inputB)}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center space-x-1.5 ${
                inputB 
                  ? 'bg-amber-500 text-industrial-950 shadow-md shadow-amber-500/30' 
                  : 'bg-industrial-900 text-slate-400 border border-industrial-700'
              }`}
            >
              <span>{inputB ? 'HIGH (1)' : 'LOW (0)'}</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click switches or truth-table rows to test combinations</span>
        </div>
      </div>

      {/* Live Circuit Schematic (SVG) */}
      <div className="bg-industrial-950/70 p-4 rounded-lg border border-industrial-800/80 flex flex-col items-center justify-center relative overflow-x-auto">
        {mode === 'NAND_ONLY_OR' && (
          <svg viewBox="0 0 680 260" className="w-full max-w-[640px] h-auto text-xs">
            {/* Input Rails */}
            {/* Input A */}
            <line x1="30" y1="60" x2="110" y2="60" stroke={wireColor(inputA)} strokeWidth="3" />
            <circle cx="30" cy="60" r="5" fill={wireColor(inputA)} />
            <text x="35" y="45" fill={inputA ? '#00f0ff' : '#94a3b8'} fontWeight="bold" fontSize="12">
              Input A = {inputA ? '1' : '0'}
            </text>

            {/* Split A into tied inputs of Gate 1 */}
            <circle cx="110" cy="60" r="4" fill={wireColor(inputA)} />
            <line x1="110" y1="60" x2="110" y2="45" stroke={wireColor(inputA)} strokeWidth="2.5" />
            <line x1="110" y1="45" x2="140" y2="45" stroke={wireColor(inputA)} strokeWidth="2.5" />
            <line x1="110" y1="60" x2="110" y2="75" stroke={wireColor(inputA)} strokeWidth="2.5" />
            <line x1="110" y1="75" x2="140" y2="75" stroke={wireColor(inputA)} strokeWidth="2.5" />

            {/* Gate 1: NAND as Inverter for A */}
            <g transform="translate(140, 30)">
              <rect x="0" y="0" width="40" height="60" fill="#0c1527" stroke="#38bdf8" strokeWidth="2" rx="4" />
              <path d="M 40 0 C 65 0 65 60 40 60 Z" fill="#0c1527" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="68" cy="30" r="5" fill="#0c1527" stroke="#38bdf8" strokeWidth="2" />
              <text x="18" y="35" fill="#e2e8f0" fontWeight="bold" fontSize="11">NAND</text>
            </g>

            {/* Wire from Gate 1 to Stage 2 */}
            <line 
              x1="213" y1="60" x2="350" y2="60" 
              stroke={wireColor(evaluation.intermediateSignals.notA, '#f59e0b')} 
              strokeWidth="3" 
            />
            <line 
              x1="350" y1="60" x2="350" y2="105" 
              stroke={wireColor(evaluation.intermediateSignals.notA, '#f59e0b')} 
              strokeWidth="3" 
            />
            <line 
              x1="350" y1="105" x2="390" y2="105" 
              stroke={wireColor(evaluation.intermediateSignals.notA, '#f59e0b')} 
              strokeWidth="3" 
            />
            <text x="225" y="52" fill={evaluation.intermediateSignals.notA ? '#f59e0b' : '#64748b'} fontSize="11" fontWeight="bold">
              NOT(A) = {evaluation.intermediateSignals.notA ? '1' : '0'}
            </text>

            {/* Input B */}
            <line x1="30" y1="200" x2="110" y2="200" stroke={wireColor(inputB, '#f59e0b')} strokeWidth="3" />
            <circle cx="30" cy="200" r="5" fill={wireColor(inputB, '#f59e0b')} />
            <text x="35" y="185" fill={inputB ? '#f59e0b' : '#94a3b8'} fontWeight="bold" fontSize="12">
              Input B = {inputB ? '1' : '0'}
            </text>

            {/* Split B into tied inputs of Gate 2 */}
            <circle cx="110" cy="200" r="4" fill={wireColor(inputB, '#f59e0b')} />
            <line x1="110" y1="200" x2="110" y2="185" stroke={wireColor(inputB, '#f59e0b')} strokeWidth="2.5" />
            <line x1="110" y1="185" x2="140" y2="185" stroke={wireColor(inputB, '#f59e0b')} strokeWidth="2.5" />
            <line x1="110" y1="200" x2="110" y2="215" stroke={wireColor(inputB, '#f59e0b')} strokeWidth="2.5" />
            <line x1="110" y1="215" x2="140" y2="215" stroke={wireColor(inputB, '#f59e0b')} strokeWidth="2.5" />

            {/* Gate 2: NAND as Inverter for B */}
            <g transform="translate(140, 170)">
              <rect x="0" y="0" width="40" height="60" fill="#0c1527" stroke="#38bdf8" strokeWidth="2" rx="4" />
              <path d="M 40 0 C 65 0 65 60 40 60 Z" fill="#0c1527" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="68" cy="30" r="5" fill="#0c1527" stroke="#38bdf8" strokeWidth="2" />
              <text x="18" y="35" fill="#e2e8f0" fontWeight="bold" fontSize="11">NAND</text>
            </g>

            {/* Wire from Gate 2 to Stage 2 */}
            <line 
              x1="213" y1="200" x2="350" y2="200" 
              stroke={wireColor(evaluation.intermediateSignals.notB, '#f59e0b')} 
              strokeWidth="3" 
            />
            <line 
              x1="350" y1="200" x2="350" y2="155" 
              stroke={wireColor(evaluation.intermediateSignals.notB, '#f59e0b')} 
              strokeWidth="3" 
            />
            <line 
              x1="350" y1="155" x2="390" y2="155" 
              stroke={wireColor(evaluation.intermediateSignals.notB, '#f59e0b')} 
              strokeWidth="3" 
            />
            <text x="225" y="192" fill={evaluation.intermediateSignals.notB ? '#f59e0b' : '#64748b'} fontSize="11" fontWeight="bold">
              NOT(B) = {evaluation.intermediateSignals.notB ? '1' : '0'}
            </text>

            {/* Gate 3: Final Combining NAND Gate */}
            <g transform="translate(390, 100)">
              <rect x="0" y="0" width="45" height="60" fill="#0c1527" stroke="#38bdf8" strokeWidth="2" rx="4" />
              <path d="M 45 0 C 70 0 70 60 45 60 Z" fill="#0c1527" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="73" cy="30" r="5" fill="#0c1527" stroke="#38bdf8" strokeWidth="2" />
              <text x="22" y="35" fill="#e2e8f0" fontWeight="bold" fontSize="11">NAND</text>
            </g>

            {/* Final Output Wire */}
            <line 
              x1="468" y1="130" x2="600" y2="130" 
              stroke={wireColor(evaluation.output, '#10b981')} 
              strokeWidth="3.5" 
            />
            <circle cx="600" cy="130" r="6" fill={wireColor(evaluation.output, '#10b981')} />
            <text x="500" y="120" fill={evaluation.output ? '#10b981' : '#94a3b8'} fontWeight="bold" fontSize="13">
              Y = A ∨ B = {evaluation.output ? '1' : '0'}
            </text>
          </svg>
        )}

        {mode === 'NOR_ONLY_AND' && (
          <svg viewBox="0 0 680 260" className="w-full max-w-[640px] h-auto text-xs">
            {/* Input A */}
            <line x1="30" y1="60" x2="110" y2="60" stroke={wireColor(inputA)} strokeWidth="3" />
            <circle cx="30" cy="60" r="5" fill={wireColor(inputA)} />
            <text x="35" y="45" fill={inputA ? '#00f0ff' : '#94a3b8'} fontWeight="bold" fontSize="12">
              Input A = {inputA ? '1' : '0'}
            </text>

            {/* Tied inputs Gate 1 (NOR) */}
            <circle cx="110" cy="60" r="4" fill={wireColor(inputA)} />
            <line x1="110" y1="60" x2="110" y2="45" stroke={wireColor(inputA)} strokeWidth="2.5" />
            <line x1="110" y1="45" x2="140" y2="45" stroke={wireColor(inputA)} strokeWidth="2.5" />
            <line x1="110" y1="60" x2="110" y2="75" stroke={wireColor(inputA)} strokeWidth="2.5" />
            <line x1="110" y1="75" x2="140" y2="75" stroke={wireColor(inputA)} strokeWidth="2.5" />

            {/* Gate 1: NOR as Inverter for A */}
            <g transform="translate(140, 30)">
              <path d="M 0 0 C 20 0 50 15 65 30 C 50 45 20 60 0 60 C 15 40 15 20 0 0 Z" fill="#0c1527" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="70" cy="30" r="5" fill="#0c1527" stroke="#f59e0b" strokeWidth="2" />
              <text x="22" y="35" fill="#e2e8f0" fontWeight="bold" fontSize="11">NOR</text>
            </g>

            {/* Wire from Gate 1 to Final Gate */}
            <line 
              x1="215" y1="60" x2="350" y2="60" 
              stroke={wireColor(evaluation.intermediateSignals.notA, '#38bdf8')} 
              strokeWidth="3" 
            />
            <line 
              x1="350" y1="60" x2="350" y2="105" 
              stroke={wireColor(evaluation.intermediateSignals.notA, '#38bdf8')} 
              strokeWidth="3" 
            />
            <line 
              x1="350" y1="105" x2="390" y2="105" 
              stroke={wireColor(evaluation.intermediateSignals.notA, '#38bdf8')} 
              strokeWidth="3" 
            />
            <text x="225" y="52" fill={evaluation.intermediateSignals.notA ? '#38bdf8' : '#64748b'} fontSize="11" fontWeight="bold">
              NOT(A) = {evaluation.intermediateSignals.notA ? '1' : '0'}
            </text>

            {/* Input B */}
            <line x1="30" y1="200" x2="110" y2="200" stroke={wireColor(inputB, '#f59e0b')} strokeWidth="3" />
            <circle cx="30" cy="200" r="5" fill={wireColor(inputB, '#f59e0b')} />
            <text x="35" y="185" fill={inputB ? '#f59e0b' : '#94a3b8'} fontWeight="bold" fontSize="12">
              Input B = {inputB ? '1' : '0'}
            </text>

            {/* Tied inputs Gate 2 (NOR) */}
            <circle cx="110" cy="200" r="4" fill={wireColor(inputB, '#f59e0b')} />
            <line x1="110" y1="200" x2="110" y2="185" stroke={wireColor(inputB, '#f59e0b')} strokeWidth="2.5" />
            <line x1="110" y1="185" x2="140" y2="185" stroke={wireColor(inputB, '#f59e0b')} strokeWidth="2.5" />
            <line x1="110" y1="200" x2="110" y2="215" stroke={wireColor(inputB, '#f59e0b')} strokeWidth="2.5" />
            <line x1="110" y1="215" x2="140" y2="215" stroke={wireColor(inputB, '#f59e0b')} strokeWidth="2.5" />

            {/* Gate 2: NOR as Inverter for B */}
            <g transform="translate(140, 170)">
              <path d="M 0 0 C 20 0 50 15 65 30 C 50 45 20 60 0 60 C 15 40 15 20 0 0 Z" fill="#0c1527" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="70" cy="30" r="5" fill="#0c1527" stroke="#f59e0b" strokeWidth="2" />
              <text x="22" y="35" fill="#e2e8f0" fontWeight="bold" fontSize="11">NOR</text>
            </g>

            {/* Wire from Gate 2 to Final Gate */}
            <line 
              x1="215" y1="200" x2="350" y2="200" 
              stroke={wireColor(evaluation.intermediateSignals.notB, '#38bdf8')} 
              strokeWidth="3" 
            />
            <line 
              x1="350" y1="200" x2="350" y2="155" 
              stroke={wireColor(evaluation.intermediateSignals.notB, '#38bdf8')} 
              strokeWidth="3" 
            />
            <line 
              x1="350" y1="155" x2="390" y2="155" 
              stroke={wireColor(evaluation.intermediateSignals.notB, '#38bdf8')} 
              strokeWidth="3" 
            />
            <text x="225" y="192" fill={evaluation.intermediateSignals.notB ? '#38bdf8' : '#64748b'} fontSize="11" fontWeight="bold">
              NOT(B) = {evaluation.intermediateSignals.notB ? '1' : '0'}
            </text>

            {/* Gate 3: Final Combining NOR Gate */}
            <g transform="translate(390, 100)">
              <path d="M 0 0 C 20 0 50 15 65 30 C 50 45 20 60 0 60 C 15 40 15 20 0 0 Z" fill="#0c1527" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="70" cy="30" r="5" fill="#0c1527" stroke="#f59e0b" strokeWidth="2" />
              <text x="22" y="35" fill="#e2e8f0" fontWeight="bold" fontSize="11">NOR</text>
            </g>

            {/* Final Output Wire */}
            <line 
              x1="465" y1="130" x2="600" y2="130" 
              stroke={wireColor(evaluation.output, '#10b981')} 
              strokeWidth="3.5" 
            />
            <circle cx="600" cy="130" r="6" fill={wireColor(evaluation.output, '#10b981')} />
            <text x="500" y="120" fill={evaluation.output ? '#10b981' : '#94a3b8'} fontWeight="bold" fontSize="13">
              Y = A ∧ B = {evaluation.output ? '1' : '0'}
            </text>
          </svg>
        )}

        {(mode === 'NAND_GATE' || mode === 'NOR_GATE') && (
          <svg viewBox="0 0 500 200" className="w-full max-w-[480px] h-auto text-xs">
            {/* Input A */}
            <line x1="60" y1="65" x2="190" y2="65" stroke={wireColor(inputA)} strokeWidth="3" />
            <circle cx="60" cy="65" r="5" fill={wireColor(inputA)} />
            <text x="70" y="52" fill={inputA ? '#00f0ff' : '#94a3b8'} fontWeight="bold" fontSize="12">
              Input A = {inputA ? '1' : '0'}
            </text>

            {/* Input B */}
            <line x1="60" y1="135" x2="190" y2="135" stroke={wireColor(inputB, '#f59e0b')} strokeWidth="3" />
            <circle cx="60" cy="135" r="5" fill={wireColor(inputB, '#f59e0b')} />
            <text x="70" y="122" fill={inputB ? '#f59e0b' : '#94a3b8'} fontWeight="bold" fontSize="12">
              Input B = {inputB ? '1' : '0'}
            </text>

            {/* Gate Symbol */}
            {mode === 'NAND_GATE' ? (
              <g transform="translate(190, 50)">
                <rect x="0" y="0" width="45" height="100" fill="#0c1527" stroke="#38bdf8" strokeWidth="2.5" rx="4" />
                <path d="M 45 0 C 80 0 80 100 45 100 Z" fill="#0c1527" stroke="#38bdf8" strokeWidth="2.5" />
                <circle cx="83" cy="50" r="6" fill="#0c1527" stroke="#38bdf8" strokeWidth="2.5" />
                <text x="24" y="55" fill="#e2e8f0" fontWeight="bold" fontSize="13">NAND</text>
              </g>
            ) : (
              <g transform="translate(190, 50)">
                <path d="M 0 0 C 30 0 65 25 85 50 C 65 75 30 100 0 100 C 20 65 20 35 0 0 Z" fill="#0c1527" stroke="#f59e0b" strokeWidth="2.5" />
                <circle cx="90" cy="50" r="6" fill="#0c1527" stroke="#f59e0b" strokeWidth="2.5" />
                <text x="28" y="55" fill="#e2e8f0" fontWeight="bold" fontSize="13">NOR</text>
              </g>
            )}

            {/* Output Wire */}
            <line 
              x1={mode === 'NAND_GATE' ? "279" : "286"} y1="100" x2="430" y2="100" 
              stroke={wireColor(evaluation.output, '#10b981')} 
              strokeWidth="3.5" 
            />
            <circle cx="430" cy="100" r="6" fill={wireColor(evaluation.output, '#10b981')} />
            <text x="320" y="90" fill={evaluation.output ? '#10b981' : '#94a3b8'} fontWeight="bold" fontSize="13">
              Y = {evaluation.output ? '1' : '0'}
            </text>
          </svg>
        )}
      </div>

      {/* Truth Table & Explanatory Footer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        {/* Truth Table (7 cols) */}
        <div className="lg:col-span-7 bg-industrial-950 p-4 rounded-lg border border-industrial-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-industrial-800">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Table className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Complete 4-Row Truth Table
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">2^2 = 4 Combinations</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="border-b border-industrial-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-2 text-left">State</th>
                  <th className="py-2 px-2">A</th>
                  <th className="py-2 px-2">B</th>
                  {(mode === 'NAND_ONLY_OR' || mode === 'NOR_ONLY_AND') && (
                    <>
                      <th className="py-2 px-2">A'</th>
                      <th className="py-2 px-2">B'</th>
                    </>
                  )}
                  <th className="py-2 px-2 text-cyan-300 font-bold">Output Y</th>
                  <th className="py-2 px-2 text-emerald-400">Equiv Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-900">
                {truthTable.map((row) => {
                  const isCurrent = row.rowNumber === currentRowIndex;
                  return (
                    <tr
                      key={row.rowNumber}
                      onClick={() => {
                        setInputA(row.a);
                        setInputB(row.b);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isCurrent 
                          ? 'bg-cyan-950/60 font-bold text-white border-l-2 border-cyan-400' 
                          : 'hover:bg-industrial-900/60 text-slate-300'
                      }`}
                    >
                      <td className="py-2 px-2 text-left font-mono text-[10px]">
                        {isCurrent ? '▶ ' : '  '}m{row.rowNumber}
                      </td>
                      <td className="py-2 px-2">
                        <span className={row.a ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                          {row.a ? '1' : '0'}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={row.b ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                          {row.b ? '1' : '0'}
                        </span>
                      </td>
                      {(mode === 'NAND_ONLY_OR' || mode === 'NOR_ONLY_AND') && (
                        <>
                          <td className="py-2 px-2 font-mono text-slate-400">
                            {row.notA ? '1' : '0'}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-400">
                            {row.notB ? '1' : '0'}
                          </td>
                        </>
                      )}
                      <td className="py-2 px-2 font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          row.output ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-900 text-slate-500'
                        }`}>
                          {row.output ? '1' : '0'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-emerald-400 text-[10px]">
                        ✓ MATCH
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Explanation Card (5 cols) */}
        <div className="lg:col-span-5 bg-industrial-950 p-4 rounded-lg border border-industrial-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>Engineering Analysis</span>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {evaluation.explanation}
            </p>
          </div>

          <div className="p-3 rounded bg-industrial-900 border border-industrial-800 space-y-1.5 text-[11px]">
            <span className="font-bold text-slate-300 uppercase tracking-wide block">Universal Gate Principle:</span>
            <p className="text-slate-400 font-sans">
              Any Boolean logic function (AND, OR, NOT, XOR) can be constructed exclusively using only NAND gates or only NOR gates. This simplifies integrated circuit (IC) manufacturing and enhances noise immunity in safety-critical industrial controllers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
