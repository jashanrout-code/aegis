import React from 'react';
import { 
  FSMState, 
  FSMTransitionRecord, 
  ZoneId 
} from '../../types/simulation';
import { 
  Activity, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  RotateCcw, 
  Clock, 
  Flame, 
  BellOff, 
  Zap,
  Info,
  Sliders,
  Check
} from 'lucide-react';
import { simulationStore } from '../../engine/simulationStore';

interface ControllerStateDiagramProps {
  currentState: FSMState;
  previousState: FSMState;
  lastTransition: FSMTransitionRecord | null;
  transitionHistory: FSMTransitionRecord[];
  activeZoneId?: ZoneId | null;
  isSandbox?: boolean;
  onClearHazard?: () => void;
  onAcknowledge?: () => void;
  onReset?: () => void;
  onTriggerEmergency?: () => void;
  onTriggerWarning?: () => void;
}

// Normalized high-level display states
export type CoreDisplayState = 'NORMAL' | 'WARNING' | 'EMERGENCY' | 'RECOVERY';

export function normalizeFsmState(state: FSMState): CoreDisplayState {
  if (state === 'ALARM_STAGE_2' || state === 'ALARM_STAGE_1') return 'EMERGENCY';
  if (state === 'WARNING' || state === 'MONITORING') return 'WARNING';
  if (state === 'RECOVERY') return 'RECOVERY';
  return 'NORMAL';
}

export const ControllerStateDiagram: React.FC<ControllerStateDiagramProps> = ({
  currentState,
  previousState,
  lastTransition,
  transitionHistory,
  activeZoneId,
  isSandbox = false,
  onClearHazard,
  onAcknowledge,
  onReset,
  onTriggerEmergency,
  onTriggerWarning,
}) => {
  const normCurrent = normalizeFsmState(currentState);
  const normPrev = normalizeFsmState(previousState);

  // Check which transition edge is currently active
  const isTransitionActive = (from: CoreDisplayState, to: CoreDisplayState) => {
    if (normPrev === from && normCurrent === to) return true;
    if (normCurrent === to) return true; // highlights active arriving path
    return false;
  };

  return (
    <div className="bg-industrial-900 border border-industrial-800 rounded-lg p-4 font-mono select-none space-y-4 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-industrial-800">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Finite State Machine (FSM) Controller
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-industrial-950 border border-industrial-800 text-cyan-400">
              DETERMINISTIC AUTOMATON
            </span>
            {isSandbox && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-bold">
                SANDBOX SIMULATION
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Strict sequential transition guards governing safety escalation, interlocks, and recovery.
          </p>
        </div>

        {/* Current State Indicator Badge */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 text-[10px]">CURRENT STATE:</span>
          <span className={`px-3 py-1 rounded font-bold border text-xs flex items-center space-x-2 shadow-sm ${
            normCurrent === 'EMERGENCY'
              ? 'bg-red-950 text-red-300 border-red-500 animate-pulse'
              : normCurrent === 'WARNING'
              ? 'bg-amber-950 text-amber-300 border-amber-500'
              : normCurrent === 'RECOVERY'
              ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
              : 'bg-emerald-950 text-emerald-300 border-emerald-500'
          }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-current"></span>
            <span>{currentState} ({normCurrent})</span>
          </span>
        </div>
      </div>

      {/* State Machine Transition Graph (Clean, spacious SVG) */}
      <div className="relative py-3 bg-industrial-950 rounded-lg border border-industrial-800 overflow-x-auto flex justify-center">
        <svg viewBox="0 0 760 250" className="w-full max-w-[720px] h-auto text-xs">
          <defs>
            <marker id="arrowEmerald" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#10b981" />
            </marker>
            <marker id="arrowAmber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#f59e0b" />
            </marker>
            <marker id="arrowRed" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#ef4444" />
            </marker>
            <marker id="arrowCyan" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#06b6d4" />
            </marker>
            <marker id="arrowDim" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#334155" />
            </marker>

            {/* Glowing filters for active nodes */}
            <filter id="fsmGlowRed" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="fsmGlowAmber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="fsmGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="fsmGlowEmerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 
            NODE COORDINATES (Spacious Diamond):
            NORMAL (x: 50, y: 95, w: 125, h: 55) Center: (112.5, 122.5)
            WARNING (x: 315, y: 15, w: 130, h: 55) Center: (380, 42.5)
            EMERGENCY (x: 585, y: 95, w: 135, h: 55) Center: (652.5, 122.5)
            RECOVERY (x: 315, y: 175, w: 130, h: 55) Center: (380, 202.5)
          */}

          {/* TRANSITION ARROW 1: NORMAL -> WARNING (Top Left Arc) */}
          {(() => {
            const active = isTransitionActive('NORMAL', 'WARNING');
            return (
              <g>
                <path
                  d="M 160 95 Q 220 30 310 35"
                  fill="none"
                  stroke={active ? '#f59e0b' : '#334155'}
                  strokeWidth={active ? '3.5' : '1.5'}
                  strokeDasharray={active ? '5 3' : undefined}
                  markerEnd={active ? 'url(#arrowAmber)' : 'url(#arrowDim)'}
                />
                <rect x="195" y="42" width="95" height="16" rx="3" fill="#090d16" stroke={active ? '#f59e0b' : '#1e293b'} strokeWidth="1" />
                <text x="200" y="54" fill={active ? '#fcd34d' : '#94a3b8'} fontSize="9.5" fontWeight="bold">
                  W=1 (Pre-Alarm)
                </text>
              </g>
            );
          })()}

          {/* TRANSITION ARROW 2: WARNING -> EMERGENCY (Top Right Arc) */}
          {(() => {
            const active = isTransitionActive('WARNING', 'EMERGENCY');
            return (
              <g>
                <path
                  d="M 445 35 Q 535 30 595 95"
                  fill="none"
                  stroke={active ? '#ef4444' : '#334155'}
                  strokeWidth={active ? '3.5' : '1.5'}
                  strokeDasharray={active ? '5 3' : undefined}
                  markerEnd={active ? 'url(#arrowRed)' : 'url(#arrowDim)'}
                />
                <rect x="475" y="42" width="105" height="16" rx="3" fill="#090d16" stroke={active ? '#ef4444' : '#1e293b'} strokeWidth="1" />
                <text x="480" y="54" fill={active ? '#fca5a5' : '#ef4444'} fontSize="9.5" fontWeight="bold">
                  E=1 or M=1
                </text>
              </g>
            );
          })()}

          {/* TRANSITION ARROW 3: NORMAL -> EMERGENCY (Direct Center Line) */}
          {(() => {
            const active = isTransitionActive('NORMAL', 'EMERGENCY') && normPrev === 'NORMAL';
            return (
              <g>
                <line
                  x1="175"
                  y1="122"
                  x2="580"
                  y2="122"
                  stroke={active ? '#ef4444' : '#334155'}
                  strokeWidth={active ? '3.5' : '1.5'}
                  strokeDasharray={active ? '6 3' : undefined}
                  markerEnd={active ? 'url(#arrowRed)' : 'url(#arrowDim)'}
                />
                <rect x="305" y="114" width="150" height="16" rx="3" fill="#090d16" stroke={active ? '#ef4444' : '#1e293b'} strokeWidth="1" />
                <text x="312" y="126" fill={active ? '#fca5a5' : '#f87171'} fontSize="9.5" fontWeight="bold">
                  Direct Trip: E=1 ∨ M=1
                </text>
              </g>
            );
          })()}

          {/* TRANSITION ARROW 4: EMERGENCY -> RECOVERY (Bottom Right Arc) */}
          {(() => {
            const active = isTransitionActive('EMERGENCY', 'RECOVERY');
            return (
              <g>
                <path
                  d="M 595 150 Q 535 215 445 210"
                  fill="none"
                  stroke={active ? '#06b6d4' : '#334155'}
                  strokeWidth={active ? '3.5' : '1.5'}
                  strokeDasharray={active ? '5 3' : undefined}
                  markerEnd={active ? 'url(#arrowCyan)' : 'url(#arrowDim)'}
                />
                <rect x="475" y="185" width="115" height="16" rx="3" fill="#090d16" stroke={active ? '#06b6d4' : '#1e293b'} strokeWidth="1" />
                <text x="480" y="197" fill={active ? '#67e8f9' : '#22d3ee'} fontSize="9.5" fontWeight="bold">
                  HazardsClear ∧ Ack
                </text>
              </g>
            );
          })()}

          {/* TRANSITION ARROW 5: RECOVERY -> NORMAL (Bottom Left Arc) */}
          {(() => {
            const active = isTransitionActive('RECOVERY', 'NORMAL');
            return (
              <g>
                <path
                  d="M 315 210 Q 225 215 160 150"
                  fill="none"
                  stroke={active ? '#10b981' : '#334155'}
                  strokeWidth={active ? '3.5' : '1.5'}
                  strokeDasharray={active ? '5 3' : undefined}
                  markerEnd={active ? 'url(#arrowEmerald)' : 'url(#arrowDim)'}
                />
                <rect x="180" y="185" width="120" height="16" rx="3" fill="#090d16" stroke={active ? '#10b981' : '#1e293b'} strokeWidth="1" />
                <text x="185" y="197" fill={active ? '#6ee7b7' : '#34d399'} fontSize="9.5" fontWeight="bold">
                  PurgeDone / SafeReset
                </text>
              </g>
            );
          })()}

          {/* TRANSITION ARROW 6: RECOVERY -> EMERGENCY (Re-escalation guard) */}
          {(() => {
            const active = normPrev === 'RECOVERY' && normCurrent === 'EMERGENCY';
            return (
              <g>
                <path
                  d="M 440 185 Q 510 160 580 145"
                  fill="none"
                  stroke={active ? '#ef4444' : '#1e293b'}
                  strokeWidth={active ? '3' : '1'}
                  strokeDasharray="3 3"
                  markerEnd={active ? 'url(#arrowRed)' : 'url(#arrowDim)'}
                />
              </g>
            );
          })()}

          {/* STATE NODES */}
          {/* 1. NORMAL NODE */}
          <g 
            transform="translate(50, 95)"
            className="cursor-pointer"
            onClick={() => onReset && onReset()}
          >
            <rect
              width="125"
              height="55"
              rx="8"
              fill={normCurrent === 'NORMAL' ? '#064e3b' : '#090d16'}
              stroke={normCurrent === 'NORMAL' ? '#10b981' : '#334155'}
              strokeWidth={normCurrent === 'NORMAL' ? '3' : '1.5'}
              filter={normCurrent === 'NORMAL' ? 'url(#fsmGlowEmerald)' : undefined}
            />
            <text x="24" y="26" fill={normCurrent === 'NORMAL' ? '#a7f3d0' : '#94a3b8'} fontWeight="bold" fontSize="13">
              NORMAL
            </text>
            <text x="18" y="42" fill={normCurrent === 'NORMAL' ? '#6ee7b7' : '#64748b'} fontSize="10">
              [S0: ALL SAFE]
            </text>
            {normCurrent === 'NORMAL' && (
              <circle cx="110" cy="18" r="4.5" fill="#10b981" />
            )}
          </g>

          {/* 2. WARNING NODE */}
          <g 
            transform="translate(315, 15)"
            className="cursor-pointer"
            onClick={() => onTriggerWarning && onTriggerWarning()}
          >
            <rect
              width="130"
              height="55"
              rx="8"
              fill={normCurrent === 'WARNING' ? '#78350f' : '#090d16'}
              stroke={normCurrent === 'WARNING' ? '#f59e0b' : '#334155'}
              strokeWidth={normCurrent === 'WARNING' ? '3' : '1.5'}
              filter={normCurrent === 'WARNING' ? 'url(#fsmGlowAmber)' : undefined}
            />
            <text x="26" y="26" fill={normCurrent === 'WARNING' ? '#fde68a' : '#94a3b8'} fontWeight="bold" fontSize="13">
              WARNING
            </text>
            <text x="20" y="42" fill={normCurrent === 'WARNING' ? '#fcd34d' : '#64748b'} fontSize="10">
              [S1: PRE-ALARM]
            </text>
            {normCurrent === 'WARNING' && (
              <circle cx="115" cy="18" r="4.5" fill="#f59e0b" />
            )}
          </g>

          {/* 3. EMERGENCY NODE */}
          <g 
            transform="translate(585, 95)"
            className="cursor-pointer"
            onClick={() => onTriggerEmergency && onTriggerEmergency()}
          >
            <rect
              width="135"
              height="55"
              rx="8"
              fill={normCurrent === 'EMERGENCY' ? '#7f1d1d' : '#090d16'}
              stroke={normCurrent === 'EMERGENCY' ? '#ef4444' : '#334155'}
              strokeWidth={normCurrent === 'EMERGENCY' ? '3' : '1.5'}
              filter={normCurrent === 'EMERGENCY' ? 'url(#fsmGlowRed)' : undefined}
            />
            <text x="20" y="26" fill={normCurrent === 'EMERGENCY' ? '#fecaca' : '#94a3b8'} fontWeight="bold" fontSize="13">
              EMERGENCY
            </text>
            <text x="18" y="42" fill={normCurrent === 'EMERGENCY' ? '#f87171' : '#64748b'} fontSize="10">
              [S2: STAGE 2 ALARM]
            </text>
            {normCurrent === 'EMERGENCY' && (
              <circle cx="120" cy="18" r="4.5" fill="#ef4444" className="animate-ping" />
            )}
          </g>

          {/* 4. RECOVERY NODE */}
          <g 
            transform="translate(315, 175)"
            className="cursor-pointer"
            onClick={() => onClearHazard && onClearHazard()}
          >
            <rect
              width="130"
              height="55"
              rx="8"
              fill={normCurrent === 'RECOVERY' ? '#164e63' : '#090d16'}
              stroke={normCurrent === 'RECOVERY' ? '#06b6d4' : '#334155'}
              strokeWidth={normCurrent === 'RECOVERY' ? '3' : '1.5'}
              filter={normCurrent === 'RECOVERY' ? 'url(#fsmGlowCyan)' : undefined}
            />
            <text x="24" y="26" fill={normCurrent === 'RECOVERY' ? '#a5f3fc' : '#94a3b8'} fontWeight="bold" fontSize="13">
              RECOVERY
            </text>
            <text x="18" y="42" fill={normCurrent === 'RECOVERY' ? '#67e8f9' : '#64748b'} fontSize="10">
              [S3: PURGE CYCLE]
            </text>
            {normCurrent === 'RECOVERY' && (
              <circle cx="115" cy="18" r="4.5" fill="#06b6d4" />
            )}
          </g>
        </svg>
      </div>

      {/* Controller Details & Active Transition Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Latest Transition Event Card */}
        <div className="p-3 bg-industrial-950 rounded border border-industrial-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Latest Transition Event</span>
            <span className="text-[10px] text-cyan-400 font-mono">
              {lastTransition ? `T+${lastTransition.simTime}s` : 'Live State'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-industrial-900 border border-industrial-700 text-slate-400">
              {previousState}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            <span className={`px-2 py-0.5 rounded font-bold border ${
              normCurrent === 'EMERGENCY'
                ? 'bg-red-950 text-red-300 border-red-700'
                : normCurrent === 'WARNING'
                ? 'bg-amber-950 text-amber-300 border-amber-700'
                : normCurrent === 'RECOVERY'
                ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                : 'bg-emerald-950 text-emerald-300 border-emerald-700'
            }`}>
              {currentState}
            </span>
          </div>

          <div className="text-[11px] text-slate-300 font-sans leading-relaxed pt-1">
            <strong className="text-cyan-400 font-mono">Trigger Cause: </strong>
            {lastTransition?.reason || (
              normCurrent === 'EMERGENCY'
                ? 'Critical emergency condition latched: E = S ∧ (T ∨ M) is HIGH or manual pull station active.'
                : normCurrent === 'WARNING'
                ? 'Pre-alarm warning condition detected: single sensor above threshold.'
                : normCurrent === 'RECOVERY'
                ? 'All hazard sensors cleared & operator acknowledged. Ventilation purge sequence active.'
                : 'Controller operating in nominal baseline monitoring state.'
            )}
          </div>
        </div>

        {/* Deterministic Interlock Rules & Interactive Workable Buttons */}
        <div className="p-3 bg-industrial-950 rounded border border-industrial-800 space-y-2 flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Deterministic Interlock Rules</span>
              <span className="text-cyan-400 text-[10px]">Workable Controls</span>
            </div>
            <ul className="text-[10px] text-slate-400 space-y-1 font-sans">
              <li>• Acknowledging an incident alerts operators, but <strong className="text-amber-400">does NOT clear physical hazards</strong>.</li>
              <li>• System reset is <strong className="text-red-400">strictly rejected</strong> while sensors detect emergency conditions.</li>
              <li>• Transition to RECOVERY requires: <code className="text-cyan-300 font-mono">allHazardsCleared ∧ isAcknowledged</code>.</li>
            </ul>
          </div>

          {/* Workable Controller Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-industrial-850">
            {onAcknowledge && (
              <button
                onClick={onAcknowledge}
                className="px-2.5 py-1 rounded bg-industrial-850 hover:bg-industrial-800 border border-industrial-700 text-cyan-300 text-[10px] flex items-center space-x-1 transition-colors"
                title="Acknowledge alert (Klaxon muted; hazard remains active)"
              >
                <BellOff className="w-3 h-3" />
                <span>Acknowledge Alert</span>
              </button>
            )}

            {onClearHazard && (
              <button
                onClick={onClearHazard}
                className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[10px] flex items-center space-x-1 transition-colors"
                title="Clear physical hazard in active zone"
              >
                <CheckCircle className="w-3 h-3" />
                <span>Clear Physical Hazard</span>
              </button>
            )}

            {onReset && (
              <button
                onClick={onReset}
                className="px-2.5 py-1 rounded bg-industrial-900 hover:bg-industrial-800 border border-industrial-700 text-slate-300 hover:text-white text-[10px] flex items-center space-x-1 transition-colors ml-auto"
                title="Complete purge and restore controller to NORMAL"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Purge / Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transition History Log */}
      {transitionHistory.length > 0 && (
        <div className="pt-2 border-t border-industrial-800 space-y-1.5">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Recent Controller Transitions ({transitionHistory.length} recorded)</span>
            </span>
            <span className="text-[9px] text-slate-500">Auto-recorded on state change</span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {transitionHistory.map((tr, idx) => (
              <div
                key={idx}
                className="p-1.5 rounded bg-industrial-950/80 border border-industrial-850 flex items-center justify-between text-[10px]"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-mono">T+{tr.simTime}s</span>
                  <span className="text-slate-400">{tr.fromState}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-cyan-400" />
                  <span className={`font-bold ${
                    tr.toState === 'ALARM_STAGE_2' 
                      ? 'text-red-400' 
                      : tr.toState === 'WARNING' 
                      ? 'text-amber-400' 
                      : tr.toState === 'RECOVERY' 
                      ? 'text-cyan-400' 
                      : 'text-emerald-400'
                  }`}>
                    {tr.toState}
                  </span>
                </div>
                <div className="text-slate-400 font-sans truncate max-w-xs text-right">
                  {tr.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
