import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Clock, 
  Cpu, 
  MessageSquare,
  FileCheck,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Radio,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Activity,
  GitCommit,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SimulationState, simulationStore } from '../engine/simulationStore';
import { LogicDiagram } from '../components/shared/LogicDiagram';
import { FSMStateBadge, SeverityBadge } from '../components/shared/StatusBadge';
import { evaluatePrimaryAlarmRule } from '../logic/gates';
import { ZoneId } from '../types/simulation';

const PLAYBACK_SPEEDS = [0.5, 1.0, 2.0, 4.0];

export const InvestigationCenter: React.FC = () => {
  const { simState } = useOutletContext<{ simState: SimulationState }>();
  const navigate = useNavigate();

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    simState.selectedIncidentId || (simState.incidents.length > 0 ? simState.incidents[0].id : null)
  );

  // Time-travel scrubber state
  const snapshots = simState.historySnapshots;
  const [snapshotIndex, setSnapshotIndex] = useState<number>(() => Math.max(0, snapshots.length - 1));
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [forensicNotes, setForensicNotes] = useState<string>('');
  const [isLogicTraceExpanded, setIsLogicTraceExpanded] = useState<boolean>(true);

  // Keep a ref to current index for event handlers and timer callbacks
  const snapshotIndexRef = useRef(snapshotIndex);
  snapshotIndexRef.current = snapshotIndex;

  // Track if user is locked to live head
  const isAtLatest = snapshots.length > 0 && snapshotIndex >= snapshots.length - 1;

  // Safely clamp snapshotIndex when snapshots array updates
  useEffect(() => {
    if (snapshots.length === 0) {
      setSnapshotIndex(-1);
      setIsReplaying(false);
      return;
    }

    setSnapshotIndex((prev) => {
      // If previously uninitialized or out of bounds
      if (prev < 0) {
        return snapshots.length - 1;
      }
      if (prev >= snapshots.length) {
        return snapshots.length - 1;
      }
      // If user was tracking the latest frame, continue tracking the new latest frame
      if (isAtLatest) {
        return snapshots.length - 1;
      }
      return prev;
    });
  }, [snapshots.length, isAtLatest]);

  // Robust, React-compatible Replay Timer
  useEffect(() => {
    if (!isReplaying || snapshots.length <= 1) {
      return;
    }

    const intervalMs = Math.max(100, Math.round(1000 / playbackSpeed));

    const timerId = window.setInterval(() => {
      setSnapshotIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= snapshots.length - 1) {
          // Reached the final frame: stop playback immediately
          setIsReplaying(false);
          return snapshots.length - 1;
        }
        return nextIndex;
      });
    }, intervalMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isReplaying, playbackSpeed, snapshots.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsReplaying(false);
    };
  }, []);

  // Safe active snapshot resolution
  const hasHistory = snapshots.length > 0;
  const safeIndex = hasHistory ? Math.max(0, Math.min(snapshots.length - 1, snapshotIndex)) : -1;
  const activeSnapshot = hasHistory && safeIndex >= 0 ? snapshots[safeIndex] : null;

  const selectedIncident = simState.incidents.find((i) => i.id === selectedIncidentId);

  // Determine current inspected zone
  const targetZoneId: ZoneId = selectedIncident 
    ? selectedIncident.zoneId 
    : (simState.selectedZoneId || 'ZONE_STORAGE');

  // Read snapshot zone data (strictly read-only historical projection)
  const inspectedZoneData = activeSnapshot 
    ? activeSnapshot.zones[targetZoneId] 
    : simState.zones[targetZoneId];

  const s = inspectedZoneData ? inspectedZoneData.sensors.smoke : false;
  const h = inspectedZoneData ? inspectedZoneData.sensors.tempHigh : false;
  const m = inspectedZoneData ? inspectedZoneData.sensors.manualEmergency : false;
  const p = inspectedZoneData ? inspectedZoneData.sensors.pressureAnomaly : false;
  const en = inspectedZoneData ? inspectedZoneData.sensors.systemEnable : true;
  const fault = inspectedZoneData ? inspectedZoneData.sensors.sensorFault : false;

  const smokeLevel = inspectedZoneData ? inspectedZoneData.sensors.smokeLevel : 0;
  const temperature = inspectedZoneData ? inspectedZoneData.sensors.temperature : 0;
  const pressure = inspectedZoneData ? inspectedZoneData.sensors.pressure : 0;

  const zoneStatus = inspectedZoneData ? inspectedZoneData.status : 'NORMAL';
  const zoneOutputs = inspectedZoneData ? inspectedZoneData.outputs : null;
  const inspectedFsmState = activeSnapshot ? activeSnapshot.fsmState : simState.fsmState;

  const logicEval = evaluatePrimaryAlarmRule(s, h, m);

  // Controls Handlers
  const handleScrubberChange = (val: number) => {
    setIsReplaying(false);
    if (!hasHistory) return;
    const clamped = Math.max(0, Math.min(snapshots.length - 1, val));
    setSnapshotIndex(clamped);
  };

  const handleStepBack = () => {
    setIsReplaying(false);
    if (!hasHistory) return;
    setSnapshotIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setIsReplaying(false);
    if (!hasHistory) return;
    setSnapshotIndex((prev) => Math.min(snapshots.length - 1, prev + 1));
  };

  const handleTogglePlay = () => {
    if (!hasHistory || snapshots.length <= 1) return;
    if (isReplaying) {
      setIsReplaying(false);
    } else {
      // If already at the end, restart from frame 0
      if (safeIndex >= snapshots.length - 1) {
        setSnapshotIndex(0);
      }
      setIsReplaying(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const handleRestoreLive = () => {
    setIsReplaying(false);
    if (!hasHistory) return;
    setSnapshotIndex(snapshots.length - 1);
  };

  const handleSaveForensicsNote = () => {
    if (selectedIncident && forensicNotes.trim()) {
      simulationStore.addIncidentNote(
        selectedIncident.id, 
        `[Forensic Finding @ Frame #${safeIndex + 1} T+${activeSnapshot ? activeSnapshot.simTime : 0}s] ${forensicNotes.trim()}`
      );
      setForensicNotes('');
    }
  };

  // Historical audit log events matching the selected point in time
  const snapshotSimTime = activeSnapshot ? activeSnapshot.simTime : simState.uptimeSeconds;
  const availableEvents = activeSnapshot ? activeSnapshot.events : simState.events;
  const historicalEvents = availableEvents
    .filter((e) => e.timestamp <= snapshotSimTime)
    .filter((e) => !selectedIncident || e.zoneId === selectedIncident.zoneId || e.category === 'CONTROLLER' || e.category === 'ALARM');

  // Response actions at this point in time
  const currentResponseActions = activeSnapshot?.responseActions || simState.responseActions;
  const zoneActions = Object.values(currentResponseActions).filter((a) => a.zoneId === targetZoneId);
  const activeZoneActions = zoneActions.filter((a) => a.status === 'ACTIVE' || a.status === 'COMPLETED');

  // AEGIS Logic Trace: 9-Step Causal Chain Evaluation (Section 3.F)
  const traceSteps = [
    {
      step: 1,
      title: 'Sensor Input Changes',
      status: (smokeLevel > 25 || temperature > 55 || m) ? 'DEVIATED' : 'NOMINAL',
      badgeColor: (smokeLevel > 25 || temperature > 55 || m) ? 'text-rose-400 bg-rose-950 border-rose-800' : 'text-slate-400 bg-industrial-950 border-industrial-800',
      summary: `Smoke: ${smokeLevel.toFixed(1)}% | Temp: ${temperature.toFixed(1)}°C | Press: ${pressure.toFixed(1)} kPa | Manual: ${m ? '1' : '0'}`,
      detail: 'Analog physical telemetry converted to digital binary states via ADC and Schmitt triggers.',
    },
    {
      step: 2,
      title: 'Comparator & Boolean Evaluation',
      status: logicEval.intermediateOr ? 'TRIGGERED (1)' : 'QUIESCENT (0)',
      badgeColor: logicEval.intermediateOr ? 'text-amber-400 bg-amber-950 border-amber-800' : 'text-slate-400 bg-industrial-950 border-industrial-800',
      summary: `S=${s ? '1' : '0'}, T=${h ? '1' : '0'}, M=${m ? '1' : '0'} → Intermediate OR (T ∨ M) = ${logicEval.intermediateOr ? '1' : '0'}`,
      detail: 'Analog threshold comparators evaluate against trigger setpoints and intermediate terms.',
    },
    {
      step: 3,
      title: 'Logic Output Changes',
      status: logicEval.alarmOutput ? 'EMERGENCY (1)' : 'CLEAR (0)',
      badgeColor: logicEval.alarmOutput ? 'text-red-400 bg-red-950 border-red-800 animate-pulse' : 'text-emerald-400 bg-emerald-950 border-emerald-800',
      summary: `E = S ∧ (T ∨ M) → Gate Output: ${logicEval.alarmOutput ? 'HIGH (1)' : 'LOW (0)'}`,
      detail: 'Combinational logic gate evaluates critical confluence to produce alarm signal E.',
    },
    {
      step: 4,
      title: 'Controller Evaluates Event',
      status: zoneOutputs?.alarmStage2 ? 'STAGE 2 EVAC' : zoneOutputs?.alarmStage1 ? 'STAGE 1 ALERT' : 'NOMINAL',
      badgeColor: zoneOutputs?.alarmStage2 ? 'text-red-400 bg-red-950 border-red-800' : zoneOutputs?.alarmStage1 ? 'text-amber-400 bg-amber-950 border-amber-800' : 'text-slate-400 bg-industrial-950 border-industrial-800',
      summary: `Klaxon: ${zoneOutputs?.alarmStage2 ? 'ACTIVE' : 'OFF'} | Doors: ${zoneOutputs?.exitDoorUnlock ? 'UNLOCKED' : 'SECURE'} | Priority: Ch ${zoneOutputs?.encodedPriority ?? 0}`,
      detail: 'Supervisory industrial logic decodes priority encoder and commands zone actuator registers.',
    },
    {
      step: 5,
      title: 'FSM Transitions',
      status: inspectedFsmState,
      badgeColor: inspectedFsmState === 'ALARM_STAGE_2' ? 'text-red-400 bg-red-950 border-red-800' : inspectedFsmState === 'WARNING' || inspectedFsmState === 'ALARM_STAGE_1' || inspectedFsmState === 'RECOVERY' ? 'text-amber-400 bg-amber-950 border-amber-800' : 'text-emerald-400 bg-emerald-950 border-emerald-800',
      summary: `FSM State: ${inspectedFsmState} (Reason: ${activeSnapshot?.lastFSMTransition?.reason || simState.lastFSMTransition?.reason || 'Nominal Operation'})`,
      detail: 'Finite State Machine transition condition satisfied; supervisory state updated.',
    },
    {
      step: 6,
      title: 'Incident Created or Updated',
      status: selectedIncident ? selectedIncident.status : 'MONITORING',
      badgeColor: selectedIncident?.status === 'ACTIVE' || selectedIncident?.status === 'DETECTED' ? 'text-red-400 bg-red-950 border-red-800' : selectedIncident ? 'text-cyan-400 bg-cyan-950 border-cyan-800' : 'text-slate-400 bg-industrial-950 border-industrial-800',
      summary: selectedIncident ? `Incident ${selectedIncident.id} [${selectedIncident.severity}] - ${selectedIncident.zoneName}` : 'No active incident logged for current snapshot',
      detail: 'Incident dossier created/updated in timeline with full telemetry and sensor history.',
    },
    {
      step: 7,
      title: 'Operator Activates Response',
      status: activeZoneActions.length > 0 ? `${activeZoneActions.length} ACTIVE` : 'STANDBY',
      badgeColor: activeZoneActions.length > 0 ? 'text-cyan-400 bg-cyan-950 border-cyan-800' : 'text-slate-400 bg-industrial-950 border-industrial-800',
      summary: activeZoneActions.length > 0 
        ? activeZoneActions.map(a => a.name.split(':')[1]?.trim() || a.type).join(', ')
        : 'Standby: No operator response action initiated for this zone yet',
      detail: 'Operator triggers 3D-linked response controls (sprinklers, ventilation, cooling, isolation).',
    },
    {
      step: 8,
      title: 'Simulated Response Progresses',
      status: activeZoneActions.some(a => a.progress >= 100) ? 'COMPLETED' : activeZoneActions.some(a => a.progress > 0) ? 'SUPPRESSING' : 'IDLE',
      badgeColor: activeZoneActions.some(a => a.progress > 0) ? 'text-emerald-400 bg-emerald-950 border-emerald-800' : 'text-slate-400 bg-industrial-950 border-industrial-800',
      summary: activeZoneActions.length > 0 
        ? `Avg Progress: ${(activeZoneActions.reduce((acc, a) => acc + a.progress, 0) / activeZoneActions.length).toFixed(0)}% (Sensors gradually cooling/clearing)`
        : 'Suppression system standing by at rest',
      detail: 'Continuous state-driven environmental simulation suppresses heat and smoke.',
    },
    {
      step: 9,
      title: 'Recovery & Formal Closure',
      status: selectedIncident?.status === 'CLOSED' ? 'CLOSED' : (smokeLevel <= 15 && temperature <= 45 && !m) ? 'ELIGIBLE' : 'PENDING',
      badgeColor: selectedIncident?.status === 'CLOSED' ? 'text-slate-400 bg-industrial-950 border-industrial-800' : (smokeLevel <= 15 && temperature <= 45 && !m) ? 'text-emerald-400 bg-emerald-950 border-emerald-800' : 'text-amber-400 bg-amber-950 border-amber-800',
      summary: (smokeLevel <= 15 && temperature <= 45 && !m)
        ? (selectedIncident?.status === 'CLOSED' ? 'Hazard neutralized. Incident closed and archived.' : 'Hazard cleared. Requires explicit operator verification.')
        : 'Active hazard condition remains in zone. Incident closure inhibited.',
      detail: 'Deterministic recovery protocol prevents premature incident closure until verified by operator.',
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none font-mono">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-industrial-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase">
              Investigation Centre & Replay
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              TIME-TRAVEL FORENSICS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reconstruct incidents, step through historical logic decisions, and inspect digital state transitions.
          </p>
        </div>

        {/* Selected Incident Dropdown */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Target Incident:</span>
          <select
            value={selectedIncidentId || ''}
            onChange={(e) => setSelectedIncidentId(e.target.value || null)}
            className="bg-industrial-900 border border-industrial-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none"
          >
            {simState.incidents.length === 0 && (
              <option value="">No Active Incidents (Monitoring All Zones)</option>
            )}
            {simState.incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.id} - {inc.zoneName} ({inc.severity})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State Banner (Rule 5) */}
      {!hasHistory ? (
        <div className="bg-industrial-900 border border-industrial-800 rounded-lg p-10 text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-industrial-850 border border-industrial-700 flex items-center justify-center mx-auto text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              No Recorded Simulation History
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto font-sans leading-relaxed">
              No recorded simulation history. Run a scenario in Simulation Studio to generate replay data.
            </p>
          </div>
          <button
            onClick={() => navigate('/simulation')}
            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-industrial-950 text-xs font-bold transition-colors inline-flex items-center space-x-2 shadow-lg shadow-cyan-500/20"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Simulation Studio</span>
          </button>
        </div>
      ) : (
        /* Time-Travel Replay Controller Bar */
        <div className="bg-industrial-900 border border-industrial-800 p-4 rounded-lg space-y-4 shadow-lg">
          {/* Top Status & Metrics Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-wrap">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Time-Travel History Scrubber
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-industrial-950 border border-industrial-800 text-slate-400 font-mono">
                Frame {safeIndex + 1} of {snapshots.length}
              </span>
              <span className="text-[10px] text-slate-500">
                ({snapshots.length} recorded frames)
              </span>
            </div>

            <div className="flex items-center space-x-3 text-xs flex-wrap">
              <div className="flex items-center space-x-1.5 bg-industrial-950 px-2.5 py-1 rounded border border-industrial-800">
                <span className="text-slate-400 text-[11px]">Timestamp:</span>
                <span className="text-cyan-neon font-bold font-mono">
                  {activeSnapshot ? `Tick #${activeSnapshot.tick} (T+${activeSnapshot.simTime}s)` : 'Live Current'}
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400 text-[11px]">Controller FSM:</span>
                <FSMStateBadge state={inspectedFsmState} size="sm" />
              </div>

              {safeIndex < snapshots.length - 1 && (
                <button
                  onClick={handleRestoreLive}
                  className="px-2.5 py-1 rounded bg-cyan-500 text-industrial-950 text-[10px] font-bold hover:bg-cyan-400 transition-colors flex items-center space-x-1"
                  title="Fast-forward to latest live simulation state"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore to Live</span>
                </button>
              )}
            </div>
          </div>

          {/* Scrubber Range Slider */}
          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max={Math.max(0, snapshots.length - 1)}
                value={safeIndex}
                onChange={(e) => handleScrubberChange(parseInt(e.target.value, 10))}
                disabled={snapshots.length <= 1}
                className="w-full h-2 bg-industrial-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>T+{snapshots[0]?.simTime ?? 0}s (Frame 1)</span>
              <span className="text-cyan-400 font-bold">
                Inspecting Frame {safeIndex + 1} (T+{activeSnapshot?.simTime ?? 0}s)
              </span>
              <span>T+{snapshots[snapshots.length - 1]?.simTime ?? 0}s (Frame {snapshots.length})</span>
            </div>
          </div>

          {/* Playback Controls & Speed Selector Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-industrial-800">
            {/* Playback Transport Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleStepBack}
                disabled={safeIndex <= 0}
                className="p-1.5 rounded bg-industrial-850 hover:bg-industrial-800 border border-industrial-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-industrial-850 transition-colors"
                title="Step 1 Frame Back (Previous)"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={handleTogglePlay}
                disabled={snapshots.length <= 1}
                className={`px-3 py-1.5 rounded text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-40 ${
                  isReplaying 
                    ? 'bg-amber-500 hover:bg-amber-400 text-industrial-950 animate-pulse' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title={isReplaying ? 'Pause Playback' : 'Play Historical Frames'}
              >
                {isReplaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isReplaying ? 'Pause' : 'Play Replay'}</span>
              </button>

              <button
                onClick={handleStepForward}
                disabled={safeIndex >= snapshots.length - 1}
                className="p-1.5 rounded bg-industrial-850 hover:bg-industrial-800 border border-industrial-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-industrial-850 transition-colors"
                title="Step 1 Frame Forward (Next)"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Playback Speed Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">Speed:</span>
              <div className="flex bg-industrial-950 p-0.5 rounded border border-industrial-800 text-[10px]">
                {PLAYBACK_SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-0.5 rounded font-mono transition-colors ${
                      playbackSpeed === speed
                        ? 'bg-cyan-500 text-industrial-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Playback Status Tag */}
            <div className="text-[11px] font-mono">
              {isReplaying ? (
                <span className="text-amber-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>PLAYING REPLAY ({playbackSpeed}x)</span>
                </span>
              ) : safeIndex === snapshots.length - 1 ? (
                <span className="text-cyan-400">HEAD (LATEST FRAME)</span>
              ) : (
                <span className="text-slate-400">PAUSED AT FRAME {safeIndex + 1}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AEGIS Logic Trace: 9-Step Causal Sequence (Section 3.F) */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-lg p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-industrial-800">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              AEGIS Logic Trace — 9-Step Causal Progression Sequence
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
              AUDIT TRAIL
            </span>
          </div>
          <button
            onClick={() => setIsLogicTraceExpanded(!isLogicTraceExpanded)}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>{isLogicTraceExpanded ? 'Collapse' : 'Expand'} Trace</span>
            {isLogicTraceExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isLogicTraceExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
            {traceSteps.map((step) => (
              <div 
                key={step.step}
                className="p-2.5 rounded bg-industrial-950 border border-industrial-800 flex flex-col justify-between space-y-2 hover:border-industrial-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 text-[10px] flex items-center justify-center font-bold">
                      {step.step}
                    </span>
                    <span className="text-[11px] font-bold text-slate-200 leading-tight">
                      {step.title}
                    </span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border uppercase shrink-0 ${step.badgeColor}`}>
                    {step.status}
                  </span>
                </div>

                <div className="text-[10px] font-mono text-cyan-300/90 bg-industrial-900/60 p-1.5 rounded border border-industrial-850">
                  {step.summary}
                </div>

                <p className="text-[9px] text-slate-500 font-sans leading-tight">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Digital Electronics Decision Decomposition (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-industrial-900 border border-industrial-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-industrial-800">
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Step-by-Step Digital Electronics Decision Decomposition</span>
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-industrial-950 border border-industrial-800 text-cyan-400">
                Zone: {targetZoneId.replace('ZONE_', '')}
              </span>
            </div>

            {/* Sub-expression evaluation cards */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {/* S input */}
              <div className="p-2.5 rounded bg-industrial-950 border border-industrial-800 text-center space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Input 1</span>
                <div className="font-bold text-slate-300">Smoke S</div>
                <div className={`text-xs font-bold ${s ? 'text-red-400' : 'text-slate-500'}`}>
                  {s ? 'HIGH (1)' : 'LOW (0)'}
                </div>
                <div className="text-[9px] text-slate-500">
                  {smokeLevel.toFixed(1)}% obscuration
                </div>
              </div>

              {/* T or M sub-expression */}
              <div className="p-2.5 rounded bg-industrial-950 border border-industrial-800 text-center space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">OR Sub-Term</span>
                <div className="font-bold text-slate-300">T ∨ M</div>
                <div className={`text-xs font-bold ${logicEval.intermediateOr ? 'text-amber-400' : 'text-slate-500'}`}>
                  {logicEval.intermediateOr ? 'TRUE (1)' : 'FALSE (0)'}
                </div>
                <div className="text-[9px] text-slate-500">
                  T={h ? '1' : '0'} ({temperature.toFixed(1)}°C) | M={m ? '1' : '0'}
                </div>
              </div>

              {/* Final AND result */}
              <div className="p-2.5 rounded bg-industrial-950 border border-industrial-800 text-center space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Final Gate</span>
                <div className="font-bold text-slate-300">E = S ∧ (T ∨ M)</div>
                <div className={`text-xs font-bold ${logicEval.alarmOutput ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                  {logicEval.alarmOutput ? 'EMERGENCY (1)' : 'CLEAR (0)'}
                </div>
                <div className="text-[9px] text-slate-500">
                  Stage 2 Confluence
                </div>
              </div>
            </div>

            {/* Logic Schematic Visualizer */}
            <LogicDiagram
              smoke={s}
              highTemp={h}
              manualEmergency={m}
              zoneName={targetZoneId.replace('ZONE_', '')}
            />

            {/* Calculated Digital Control Outputs at this historical frame */}
            {zoneOutputs && (
              <div className="p-3 rounded bg-industrial-950 border border-industrial-800 space-y-2 text-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Historical Digital Actuator & Controller Registers:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="flex justify-between items-center p-1.5 rounded bg-industrial-900 border border-industrial-850">
                    <span className="text-slate-400">Alarm Stage 1:</span>
                    <span className={zoneOutputs.alarmStage1 ? 'text-amber-400 font-bold' : 'text-slate-600'}>
                      {zoneOutputs.alarmStage1 ? 'ACTIVE (1)' : 'OFF (0)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-1.5 rounded bg-industrial-900 border border-industrial-850">
                    <span className="text-slate-400">Alarm Stage 2:</span>
                    <span className={zoneOutputs.alarmStage2 ? 'text-red-400 font-bold' : 'text-slate-600'}>
                      {zoneOutputs.alarmStage2 ? 'ACTIVE (1)' : 'OFF (0)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-1.5 rounded bg-industrial-900 border border-industrial-850">
                    <span className="text-slate-400">Ventilation:</span>
                    <span className={zoneOutputs.ventilationOverride ? 'text-cyan-400 font-bold' : 'text-slate-600'}>
                      {zoneOutputs.ventilationOverride ? 'OPEN (1)' : 'AUTO (0)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-1.5 rounded bg-industrial-900 border border-industrial-850">
                    <span className="text-slate-400">Blast Doors:</span>
                    <span className={zoneOutputs.exitDoorUnlock ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                      {zoneOutputs.exitDoorUnlock ? 'UNLOCKED (1)' : 'SECURE (0)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-1.5 rounded bg-industrial-900 border border-industrial-850">
                    <span className="text-slate-400">Parity Check:</span>
                    <span className={zoneOutputs.parityValid ? 'text-emerald-400 font-bold' : 'text-purple-400 font-bold'}>
                      {zoneOutputs.parityValid ? 'VALID' : 'PARITY ERR'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-1.5 rounded bg-industrial-900 border border-industrial-850">
                    <span className="text-slate-400">Priority Enc:</span>
                    <span className="text-slate-300 font-bold">
                      Ch {zoneOutputs.encodedPriority}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Formal Logic Explanation */}
            <div className="p-3 rounded bg-industrial-950/80 border border-industrial-800/80 text-[11px] text-slate-300 font-sans space-y-1">
              <strong className="text-cyan-400 font-mono">Formal Analysis: </strong>
              {logicEval.alarmOutput ? (
                <span>
                  The critical confluence condition was reached because Smoke detector (S) registered HIGH simultaneously with the thermal or manual emergency OR term. By Boolean simplification rule, A = (S ∧ H) ∨ (S ∧ M), forcing the controller FSM into Stage 2 Emergency state.
                </span>
              ) : (
                <span>
                  No emergency alarm confluence at this snapshot. Even if an individual sensor (such as temperature or pressure) deviates, the primary AND gate inhibits full evacuation klaxon until verified confluence or direct manual emergency pull occurs.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Chronological Event Audit & Investigator Notes (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Historical Event Feed for Incident */}
          <div className="bg-industrial-900 border border-industrial-800 rounded-lg p-4 space-y-3 flex flex-col h-[340px]">
            <div className="flex items-center justify-between pb-2 border-b border-industrial-800">
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <span>Event Audit Log</span>
              </h2>
              <span className="text-[10px] text-cyan-400 font-mono">
                Up to T+{snapshotSimTime}s ({historicalEvents.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              {historicalEvents.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-[11px] font-sans">
                  No historical events logged up to T+{snapshotSimTime}s.
                </div>
              ) : (
                historicalEvents.slice(0, 15).map((evt) => (
                  <div key={evt.id} className="p-2 rounded bg-industrial-950 border border-industrial-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-200">{evt.title}</span>
                      <span className="text-[10px] text-cyan-400 font-mono">T+{evt.timestamp}s</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{evt.details}</p>
                    <div className="flex items-center space-x-1.5 text-[9px] text-slate-500 font-mono">
                      <span>[{evt.category}]</span>
                      {evt.zoneId && <span>• {evt.zoneId.replace('ZONE_', '')}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Forensic Notes Editor */}
          <div className="bg-industrial-900 border border-industrial-800 rounded-lg p-4 space-y-2">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Investigator Findings</span>
            </h2>

            <textarea
              rows={3}
              placeholder="Record forensic conclusions, logic observations, or root cause determination..."
              value={forensicNotes}
              onChange={(e) => setForensicNotes(e.target.value)}
              className="w-full bg-industrial-950 border border-industrial-800 rounded p-2 text-xs text-slate-200 font-sans focus:outline-none focus:border-cyan-500"
            />

            <button
              onClick={handleSaveForensicsNote}
              disabled={!forensicNotes.trim() || !selectedIncident}
              className="w-full py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-bold text-xs transition-colors disabled:opacity-50"
            >
              {selectedIncident ? 'Save Forensic Note to Incident' : 'Select an Incident to Save Findings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
