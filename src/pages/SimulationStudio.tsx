import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  FlaskConical, 
  Play, 
  Plus, 
  Trash2, 
  RotateCcw, 
  CheckCircle, 
  Cpu, 
  Layers, 
  Sliders, 
  Flame, 
  Thermometer, 
  Gauge, 
  Clock,
  Sparkles,
  AlertTriangle,
  Radio,
  Activity,
  ArrowRight,
  ShieldAlert,
  Zap,
  Split
} from 'lucide-react';
import { SimulationState, simulationStore, INITIAL_ZONE_CONFIGS } from '../engine/simulationStore';
import { PRESET_SCENARIOS, ScenarioDefinition, scenarioEngine } from '../engine/scenarios';
import { ZoneId, FSMState, FSMTransitionRecord } from '../types/simulation';
import { evaluateFsmFromDEInputs } from '../logic/fsm';
import { LogicCircuitVisualizer } from '../components/shared/LogicCircuitVisualizer';
import { ControllerStateDiagram } from '../components/shared/ControllerStateDiagram';
import { FSMStateBadge } from '../components/shared/StatusBadge';

interface CustomStep {
  id: string;
  delayMs: number;
  sensor: 'smokeLevel' | 'temperature' | 'pressure' | 'manualEmergency';
  value: number | boolean;
  label: string;
}

export const SimulationStudio: React.FC = () => {
  const { simState } = useOutletContext<{ simState: SimulationState }>();
  const navigate = useNavigate();

  // Primary Studio View Switcher required by prompt:
  // - Incident Simulation (default / primary)
  // - Logic View (Digital Electronics & Controller FSM)
  const [studioView, setStudioView] = useState<'INCIDENT_SIM' | 'LOGIC_VIEW'>('INCIDENT_SIM');

  // Sub-tabs for Incident Simulation
  const [incidentTab, setIncidentTab] = useState<'PRESETS' | 'CUSTOM'>('PRESETS');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);

  // Logic View Mode: Live Facility Sync vs Independent Sandbox Demonstration
  const [logicMode, setLogicMode] = useState<'LIVE_SYNC' | 'SANDBOX'>('LIVE_SYNC');
  const [sandboxInputs, setSandboxInputs] = useState({
    smoke: false,
    tempHigh: false,
    manualEmergency: false,
  });

  // Dedicated Sandbox FSM State & History
  const [sandboxFsmState, setSandboxFsmState] = useState<FSMState>('NORMAL');
  const [sandboxPrevFsmState, setSandboxPrevFsmState] = useState<FSMState>('NORMAL');
  const [sandboxLastTransition, setSandboxLastTransition] = useState<FSMTransitionRecord | null>(null);
  const [sandboxTransitionHistory, setSandboxTransitionHistory] = useState<FSMTransitionRecord[]>([]);
  const [sandboxIsAcknowledged, setSandboxIsAcknowledged] = useState(false);
  const [sandboxStartTime] = useState(() => Date.now());

  // Selected Zone for Inspection
  const targetZoneId: ZoneId = simState.selectedZoneId || 'ZONE_STORAGE';
  const targetZone = simState.zones[targetZoneId];

  // Live sensor inputs from active zone
  const liveSmoke = targetZone?.sensors.smoke ?? false;
  const liveTempHigh = targetZone?.sensors.tempHigh ?? false;
  const liveManual = targetZone?.sensors.manualEmergency ?? false;

  // Active inputs depending on mode
  const displayedSmoke = logicMode === 'LIVE_SYNC' ? liveSmoke : sandboxInputs.smoke;
  const displayedTempHigh = logicMode === 'LIVE_SYNC' ? liveTempHigh : sandboxInputs.tempHigh;
  const displayedManual = logicMode === 'LIVE_SYNC' ? liveManual : sandboxInputs.manualEmergency;

  // Custom Scenario Builder State
  const [customZoneId, setCustomZoneId] = useState<ZoneId>('ZONE_STORAGE');
  const [customSteps, setCustomSteps] = useState<CustomStep[]>([
    { id: '1', delayMs: 500, sensor: 'smokeLevel', value: 45.0, label: 'Elevate smoke to 45% (S=1)' },
    { id: '2', delayMs: 1500, sensor: 'temperature', value: 75.0, label: 'Spike heat to 75°C (T=1) triggering E=S∧(T∨M)' },
  ]);

  const [stepSensor, setStepSensor] = useState<'smokeLevel' | 'temperature' | 'pressure' | 'manualEmergency'>('smokeLevel');
  const [stepValue, setStepValue] = useState<number>(50);
  const [stepDelay, setStepDelay] = useState<number>(1000);

  const categories = ['ALL', 'BASELINE', 'SINGLE_HAZARD', 'CONFLUENCE', 'DIAGNOSTIC', 'LIFECYCLE', 'CASCADING'];

  const filteredPresets = PRESET_SCENARIOS.filter(s => {
    if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
    return true;
  });

  const handleRunPreset = (scenario: ScenarioDefinition) => {
    setRunningScenarioId(scenario.id);
    scenarioEngine.runScenario(scenario, () => {
      setRunningScenarioId(null);
    });
  };

  const handleAddCustomStep = () => {
    const newStep: CustomStep = {
      id: Date.now().toString(),
      delayMs: stepDelay,
      sensor: stepSensor,
      value: stepSensor === 'manualEmergency' ? true : stepValue,
      label: stepSensor === 'manualEmergency' 
        ? 'Trip Manual Pull Station (M=1)' 
        : `Set ${stepSensor} to ${stepValue}`,
    };
    setCustomSteps([...customSteps, newStep]);
  };

  const handleRemoveCustomStep = (id: string) => {
    setCustomSteps(customSteps.filter(s => s.id !== id));
  };

  const handleRunCustom = () => {
    simulationStore.resetSimulation();
    simulationStore.selectZone(customZoneId);

    let delay = 0;
    customSteps.forEach((step, idx) => {
      delay += step.delayMs;
      setTimeout(() => {
        if (step.sensor === 'manualEmergency') {
          simulationStore.triggerEmergencyPull(customZoneId);
        } else {
          simulationStore.setAnalogLevel(customZoneId, step.sensor, step.value as number);
        }
        simulationStore.addEvent({
          category: 'SYSTEM',
          title: `Custom Scenario Step ${idx + 1}/${customSteps.length}`,
          details: `${step.label} in ${customZoneId}`,
          severity: 'INFO',
        });
      }, delay);
    });
  };

  // Direct Incident Trigger Helpers
  const handleTriggerSmoke = () => {
    simulationStore.setAnalogLevel(targetZoneId, 'smokeLevel', 48.0);
  };

  const handleTriggerTemp = () => {
    simulationStore.setAnalogLevel(targetZoneId, 'temperature', 82.0);
  };

  const handleTriggerConfluence = () => {
    simulationStore.setAnalogLevel(targetZoneId, 'smokeLevel', 55.0);
    simulationStore.setAnalogLevel(targetZoneId, 'temperature', 85.0);
  };

  const handleTriggerManual = () => {
    simulationStore.triggerEmergencyPull(targetZoneId);
  };

  const handleTriggerPressure = () => {
    simulationStore.setAnalogLevel(targetZoneId, 'pressure', 145.0);
  };

  const handleTriggerFault = () => {
    simulationStore.setFaultInjection({
      zoneId: targetZoneId,
      faultType: 'PARITY_ERROR',
      affectedSensor: 'smoke',
    });
  };

  // LIVE Input Change handler: toggles inputs directly in the active monitored zone
  const handleLiveInputChange = (newInputs: { smoke: boolean; tempHigh: boolean; manualEmergency: boolean }) => {
    if (newInputs.smoke !== liveSmoke) {
      simulationStore.setAnalogLevel(targetZoneId, 'smokeLevel', newInputs.smoke ? 48.0 : 4.0);
    }
    if (newInputs.tempHigh !== liveTempHigh) {
      simulationStore.setAnalogLevel(targetZoneId, 'temperature', newInputs.tempHigh ? 82.0 : 24.0);
    }
    if (newInputs.manualEmergency !== liveManual) {
      if (newInputs.manualEmergency) {
        simulationStore.triggerEmergencyPull(targetZoneId);
      } else {
        const z = simState.zones[targetZoneId];
        if (z) z.sensors.manualEmergency = false;
        simulationStore.tick();
      }
    }
  };

  // SANDBOX Input Change handler: updates sandbox inputs AND executes deterministic FSM transition!
  const updateSandboxInputs = (newInputs: { smoke: boolean; tempHigh: boolean; manualEmergency: boolean }) => {
    setSandboxInputs(newInputs);
    const res = evaluateFsmFromDEInputs(
      sandboxFsmState,
      newInputs.smoke,
      newInputs.tempHigh,
      newInputs.manualEmergency,
      sandboxIsAcknowledged
    );

    if (res.toState !== sandboxFsmState) {
      const rec: FSMTransitionRecord = {
        fromState: sandboxFsmState,
        toState: res.toState,
        reason: res.reason,
        timestamp: Date.now(),
        simTime: Math.max(1, Math.floor((Date.now() - sandboxStartTime) / 1000)),
      };
      setSandboxPrevFsmState(sandboxFsmState);
      setSandboxFsmState(res.toState);
      setSandboxLastTransition(rec);
      setSandboxTransitionHistory(prev => [rec, ...prev.slice(0, 19)]);
    } else {
      // Update trigger description for current steady state
      const rec: FSMTransitionRecord = {
        fromState: sandboxPrevFsmState,
        toState: sandboxFsmState,
        reason: res.reason,
        timestamp: Date.now(),
        simTime: Math.max(1, Math.floor((Date.now() - sandboxStartTime) / 1000)),
      };
      setSandboxLastTransition(rec);
    }
  };

  const handleSandboxAcknowledge = () => {
    setSandboxIsAcknowledged(true);
    const allHazardsCleared = !sandboxInputs.smoke && !sandboxInputs.tempHigh && !sandboxInputs.manualEmergency;
    if (allHazardsCleared && (sandboxFsmState === 'ALARM_STAGE_2' || sandboxFsmState === 'WARNING')) {
      const rec: FSMTransitionRecord = {
        fromState: sandboxFsmState,
        toState: 'RECOVERY',
        reason: 'Hazards cleared and operator acknowledged — sequential ventilation purge initiated',
        timestamp: Date.now(),
        simTime: Math.max(1, Math.floor((Date.now() - sandboxStartTime) / 1000)),
      };
      setSandboxPrevFsmState(sandboxFsmState);
      setSandboxFsmState('RECOVERY');
      setSandboxLastTransition(rec);
      setSandboxTransitionHistory(prev => [rec, ...prev.slice(0, 19)]);
    } else {
      const rec: FSMTransitionRecord = {
        fromState: sandboxFsmState,
        toState: sandboxFsmState,
        reason: 'Operator acknowledged alert (Klaxon muted). Hazard still detected by sensors.',
        timestamp: Date.now(),
        simTime: Math.max(1, Math.floor((Date.now() - sandboxStartTime) / 1000)),
      };
      setSandboxLastTransition(rec);
    }
  };

  const handleSandboxClearHazard = () => {
    const newInputs = { smoke: false, tempHigh: false, manualEmergency: false };
    setSandboxInputs(newInputs);
    if (sandboxIsAcknowledged && (sandboxFsmState === 'ALARM_STAGE_2' || sandboxFsmState === 'WARNING')) {
      const rec: FSMTransitionRecord = {
        fromState: sandboxFsmState,
        toState: 'RECOVERY',
        reason: 'All physical hazards cleared & operator acknowledged — entering controlled recovery',
        timestamp: Date.now(),
        simTime: Math.max(1, Math.floor((Date.now() - sandboxStartTime) / 1000)),
      };
      setSandboxPrevFsmState(sandboxFsmState);
      setSandboxFsmState('RECOVERY');
      setSandboxLastTransition(rec);
      setSandboxTransitionHistory(prev => [rec, ...prev.slice(0, 19)]);
    } else if (sandboxFsmState === 'ALARM_STAGE_2') {
      const rec: FSMTransitionRecord = {
        fromState: sandboxFsmState,
        toState: 'ALARM_STAGE_2',
        reason: 'Physical hazard cleared by sensors, but requires operator acknowledgement to initiate recovery',
        timestamp: Date.now(),
        simTime: Math.max(1, Math.floor((Date.now() - sandboxStartTime) / 1000)),
      };
      setSandboxLastTransition(rec);
    } else if (sandboxFsmState === 'WARNING') {
      const rec: FSMTransitionRecord = {
        fromState: 'WARNING',
        toState: 'NORMAL',
        reason: 'Warning sensor readings returned to nominal baseline',
        timestamp: Date.now(),
        simTime: Math.max(1, Math.floor((Date.now() - sandboxStartTime) / 1000)),
      };
      setSandboxPrevFsmState('WARNING');
      setSandboxFsmState('NORMAL');
      setSandboxLastTransition(rec);
      setSandboxTransitionHistory(prev => [rec, ...prev.slice(0, 19)]);
    }
  };

  const handleSandboxReset = () => {
    const hasHazard = sandboxInputs.smoke || sandboxInputs.tempHigh || sandboxInputs.manualEmergency;
    if (hasHazard && sandboxFsmState === 'ALARM_STAGE_2') {
      const rec: FSMTransitionRecord = {
        fromState: 'ALARM_STAGE_2',
        toState: 'ALARM_STAGE_2',
        reason: 'RESET REJECTED: Safety interlock active — physical sensors still detect hazard!',
        timestamp: Date.now(),
        simTime: Math.max(1, Math.floor((Date.now() - sandboxStartTime) / 1000)),
      };
      setSandboxLastTransition(rec);
      return;
    }

    const rec: FSMTransitionRecord = {
      fromState: sandboxFsmState,
      toState: 'NORMAL',
      reason: 'Purge sequence verified complete — controller re-armed to NORMAL baseline',
      timestamp: Date.now(),
      simTime: Math.max(1, Math.floor((Date.now() - sandboxStartTime) / 1000)),
    };
    setSandboxPrevFsmState(sandboxFsmState);
    setSandboxFsmState('NORMAL');
    setSandboxLastTransition(rec);
    setSandboxTransitionHistory(prev => [rec, ...prev.slice(0, 19)]);
    setSandboxInputs({ smoke: false, tempHigh: false, manualEmergency: false });
    setSandboxIsAcknowledged(false);
  };

  const handleApplySandboxToZone = () => {
    if (sandboxInputs.smoke) {
      simulationStore.setAnalogLevel(targetZoneId, 'smokeLevel', 52.0);
    } else {
      simulationStore.setAnalogLevel(targetZoneId, 'smokeLevel', 4.0);
    }

    if (sandboxInputs.tempHigh) {
      simulationStore.setAnalogLevel(targetZoneId, 'temperature', 80.0);
    } else {
      simulationStore.setAnalogLevel(targetZoneId, 'temperature', 24.0);
    }

    if (sandboxInputs.manualEmergency) {
      simulationStore.triggerEmergencyPull(targetZoneId);
    } else {
      const z = simState.zones[targetZoneId];
      if (z) z.sensors.manualEmergency = false;
      simulationStore.tick();
    }

    setLogicMode('LIVE_SYNC');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none font-mono">
      {/* Page Header with Compact View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-industrial-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase">
              Simulation Studio
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              DIGITAL TWIN ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Benchmark industrial emergency response and inspect underlying digital electronics decision logic.
          </p>
        </div>

        {/* Studio Primary View Switcher */}
        <div className="flex bg-industrial-950 border border-industrial-800 p-1 rounded-lg text-xs shadow-inner">
          <button
            onClick={() => setStudioView('INCIDENT_SIM')}
            className={`px-4 py-2 rounded-md font-bold transition-all flex items-center space-x-2 ${
              studioView === 'INCIDENT_SIM'
                ? 'bg-cyan-500 text-industrial-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Incident Simulation</span>
          </button>

          <button
            onClick={() => setStudioView('LOGIC_VIEW')}
            className={`px-4 py-2 rounded-md font-bold transition-all flex items-center space-x-2 ${
              studioView === 'LOGIC_VIEW'
                ? 'bg-cyan-500 text-industrial-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Logic View</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 border border-cyan-700 text-cyan-300">
              DE Core
            </span>
          </button>
        </div>
      </div>

      {/* VIEW 1: INCIDENT SIMULATION (Primary Experience) */}
      {studioView === 'INCIDENT_SIM' && (
        <div className="space-y-6">
          {/* Quick Direct Incident Injector Strip */}
          <div className="bg-industrial-900 border border-industrial-800 rounded-lg p-4 space-y-3 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-industrial-800/80">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Quick Incident Triggers: Monitored Zone [{targetZone?.config.name || targetZoneId}]
                </h3>
              </div>

              {/* Target Zone Selector */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400 text-[11px]">Select Zone:</span>
                <select
                  value={targetZoneId}
                  onChange={(e) => simulationStore.selectZone(e.target.value as ZoneId)}
                  className="bg-industrial-950 border border-industrial-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none text-xs"
                >
                  {(Object.keys(INITIAL_ZONE_CONFIGS) as ZoneId[]).map((zid) => (
                    <option key={zid} value={zid}>
                      {INITIAL_ZONE_CONFIGS[zid].name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Direct Trigger Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <button
                onClick={handleTriggerSmoke}
                className="p-2.5 rounded bg-industrial-950 hover:bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 hover:border-cyan-500 font-bold flex flex-col items-center justify-center space-y-1 transition-all"
              >
                <Flame className="w-4 h-4 text-cyan-400" />
                <span>Smoke Detection</span>
                <span className="text-[10px] text-slate-400 font-normal">S=1 (Pre-Alarm)</span>
              </button>

              <button
                onClick={handleTriggerTemp}
                className="p-2.5 rounded bg-industrial-950 hover:bg-amber-950/60 border border-amber-800/60 text-amber-300 hover:border-amber-500 font-bold flex flex-col items-center justify-center space-y-1 transition-all"
              >
                <Thermometer className="w-4 h-4 text-amber-400" />
                <span>High Temperature</span>
                <span className="text-[10px] text-slate-400 font-normal">T=1 (Thermal Spike)</span>
              </button>

              <button
                onClick={handleTriggerConfluence}
                className="p-2.5 rounded bg-red-950/40 hover:bg-red-950/80 border border-red-700/80 text-red-300 hover:border-red-500 font-bold flex flex-col items-center justify-center space-y-1 transition-all"
              >
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Dual Confluence</span>
                <span className="text-[10px] text-red-400 font-normal">S=1 ∧ T=1 ➔ E=1</span>
              </button>

              <button
                onClick={handleTriggerManual}
                className="p-2.5 rounded bg-red-950/40 hover:bg-red-950/80 border border-red-700/80 text-red-300 hover:border-red-500 font-bold flex flex-col items-center justify-center space-y-1 transition-all"
              >
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Manual Alarm Pull</span>
                <span className="text-[10px] text-red-400 font-normal">M=1 (Direct Trip)</span>
              </button>

              <button
                onClick={handleTriggerPressure}
                className="p-2.5 rounded bg-industrial-950 hover:bg-purple-950/60 border border-purple-800/60 text-purple-300 hover:border-purple-500 font-bold flex flex-col items-center justify-center space-y-1 transition-all"
              >
                <Gauge className="w-4 h-4 text-purple-400" />
                <span>Pressure Anomaly</span>
                <span className="text-[10px] text-slate-400 font-normal">P=1 (Surge 145 PSI)</span>
              </button>

              <button
                onClick={handleTriggerFault}
                className="p-2.5 rounded bg-industrial-950 hover:bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 hover:border-indigo-500 font-bold flex flex-col items-center justify-center space-y-1 transition-all"
              >
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>Sensor Parity Fault</span>
                <span className="text-[10px] text-slate-400 font-normal">F=1 (Telemetry Bitflip)</span>
              </button>
            </div>

            {/* Quick Feedback Bar */}
            <div className="pt-2 border-t border-industrial-800 flex flex-wrap items-center justify-between text-xs gap-2">
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="text-slate-400">Zone Status:</span>
                <span className={`font-bold ${
                  targetZone?.status === 'EMERGENCY'
                    ? 'text-red-400'
                    : targetZone?.status === 'WARNING'
                    ? 'text-amber-400'
                    : targetZone?.status === 'FAULT'
                    ? 'text-indigo-400'
                    : 'text-emerald-400'
                }`}>
                  {targetZone?.status || 'NORMAL'}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">Smoke: <strong className="text-slate-200">{targetZone?.sensors.smokeLevel.toFixed(1)}% ({liveSmoke ? '1' : '0'})</strong></span>
                <span className="text-slate-400">Temp: <strong className="text-slate-200">{targetZone?.sensors.temperature.toFixed(1)}°C ({liveTempHigh ? '1' : '0'})</strong></span>
                <span className="text-slate-400">Manual: <strong className="text-slate-200">{liveManual ? 'TRIPPED (1)' : 'CLEAR (0)'}</strong></span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => simulationStore.clearHazardInZone(targetZoneId)}
                  className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[11px] font-bold transition-colors"
                >
                  Extinguish / Clear Zone
                </button>
                <button
                  onClick={() => setStudioView('LOGIC_VIEW')}
                  className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[11px] flex items-center space-x-1 transition-colors"
                >
                  <span>Inspect Logic Decision</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Sub-Tabs: Preset Library vs Custom Scenario Builder */}
          <div className="flex items-center justify-between border-b border-industrial-800 pb-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIncidentTab('PRESETS')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  incidentTab === 'PRESETS'
                    ? 'bg-industrial-850 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Preset Scenario Library (12)
              </button>
              <button
                onClick={() => setIncidentTab('CUSTOM')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  incidentTab === 'CUSTOM'
                    ? 'bg-industrial-850 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom Scenario Builder
              </button>
            </div>

            <button
              onClick={() => simulationStore.resetSimulation()}
              className="text-[11px] text-slate-400 hover:text-red-400 flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Entire Simulation</span>
            </button>
          </div>

          {/* PRESET LIBRARY */}
          {incidentTab === 'PRESETS' ? (
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-2 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-md border transition-colors ${
                      selectedCategory === cat 
                        ? 'bg-industrial-850 border-cyan-500 text-cyan-400 font-bold' 
                        : 'bg-industrial-900 border-industrial-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {cat.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              {/* Grid of Preset Scenario Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPresets.map((scen) => {
                  const isRunning = runningScenarioId === scen.id;
                  return (
                    <div
                      key={scen.id}
                      className="bg-industrial-900 border border-industrial-800 hover:border-industrial-700 p-4 rounded-lg flex flex-col justify-between text-xs space-y-3 transition-colors shadow-sm"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-cyan-neon font-bold tracking-wider">
                            #{scen.number} | {scen.id}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-industrial-950 border border-industrial-800 text-slate-400">
                            {scen.category}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-100">
                          {scen.title}
                        </h3>

                        <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                          {scen.description}
                        </p>

                        <div className="p-2.5 rounded bg-industrial-950/80 border border-industrial-800/80 space-y-1">
                          <div className="text-[10px] text-slate-400">
                            <strong className="text-cyan-400">Logic:</strong> {scen.digitalLogicFocus}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            <strong className="text-amber-400">Expected:</strong> {scen.expectedOutcome}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-industrial-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">
                          Zone: {scen.targetZone.replace('ZONE_', '')}
                        </span>
                        <button
                          onClick={() => handleRunPreset(scen)}
                          disabled={isRunning}
                          className={`px-3 py-1.5 rounded font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md ${
                            isRunning 
                              ? 'bg-amber-500 text-industrial-950 animate-pulse' 
                              : 'bg-cyan-500 hover:bg-cyan-400 text-industrial-950'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{isRunning ? 'Running...' : 'Execute'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* CUSTOM SCENARIO BUILDER */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Builder Controls */}
              <div className="lg:col-span-5 bg-industrial-900 border border-industrial-800 rounded-lg p-4 space-y-4">
                <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-2 border-b border-industrial-800 flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Configure Scenario Step</span>
                </h2>

                <div className="space-y-1 text-xs">
                  <label className="text-slate-400">Target Facility Zone:</label>
                  <select
                    value={customZoneId}
                    onChange={(e) => setCustomZoneId(e.target.value as ZoneId)}
                    className="w-full bg-industrial-950 border border-industrial-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none"
                  >
                    {(Object.keys(INITIAL_ZONE_CONFIGS) as ZoneId[]).map((zid) => (
                      <option key={zid} value={zid}>
                        {INITIAL_ZONE_CONFIGS[zid].name} ({zid})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-slate-400">Sensor Parameter:</label>
                  <select
                    value={stepSensor}
                    onChange={(e) => setStepSensor(e.target.value as any)}
                    className="w-full bg-industrial-950 border border-industrial-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none"
                  >
                    <option value="smokeLevel">Smoke Sensor (% obscuration)</option>
                    <option value="temperature">Thermal Sensor (°C)</option>
                    <option value="pressure">Pressure Vessel (PSI)</option>
                    <option value="manualEmergency">Manual Pull Station (Discrete M)</option>
                  </select>
                </div>

                {stepSensor !== 'manualEmergency' && (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <label className="text-slate-400">Target Value:</label>
                      <span className="font-bold text-cyan-400">
                        {stepValue} {stepSensor === 'smokeLevel' ? '%' : stepSensor === 'temperature' ? '°C' : 'PSI'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={stepSensor === 'smokeLevel' ? '100' : stepSensor === 'temperature' ? '120' : '180'}
                      value={stepValue}
                      onChange={(e) => setStepValue(parseFloat(e.target.value))}
                      className="w-full h-1 bg-industrial-800 rounded appearance-none accent-cyan-400"
                    />
                  </div>
                )}

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <label className="text-slate-400">Step Delay:</label>
                    <span className="font-bold text-slate-200">{stepDelay} ms</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="5000"
                    step="100"
                    value={stepDelay}
                    onChange={(e) => setStepDelay(parseInt(e.target.value))}
                    className="w-full h-1 bg-industrial-800 rounded appearance-none accent-cyan-400"
                  />
                </div>

                <button
                  onClick={handleAddCustomStep}
                  className="w-full py-2 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Append Step to Sequence</span>
                </button>
              </div>

              {/* Timeline Runner */}
              <div className="lg:col-span-7 bg-industrial-900 border border-industrial-800 rounded-lg p-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-industrial-800">
                    <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>Configured Timeline ({customSteps.length} Steps)</span>
                    </h2>
                    <button
                      onClick={() => setCustomSteps([])}
                      className="text-[10px] text-red-400 hover:text-red-300"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {customSteps.map((step, idx) => (
                      <div
                        key={step.id}
                        className="p-2.5 rounded bg-industrial-950 border border-industrial-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-industrial-850 border border-industrial-700 flex items-center justify-center text-[10px] text-cyan-400 font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-200">{step.label}</div>
                            <div className="text-[10px] text-slate-500">Delay: +{step.delayMs}ms</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCustomStep(step.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-industrial-800 flex items-center justify-end space-x-3">
                  <button
                    onClick={() => simulationStore.resetSimulation()}
                    className="px-3 py-2 rounded bg-industrial-850 hover:bg-industrial-800 border border-industrial-700 text-slate-300 text-xs transition-colors"
                  >
                    Reset Facility
                  </button>
                  <button
                    onClick={handleRunCustom}
                    disabled={customSteps.length === 0}
                    className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-industrial-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    <span>Execute Custom Scenario</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: LOGIC VIEW (Digital Electronics Decision & Controller State) */}
      {studioView === 'LOGIC_VIEW' && (
        <div className="space-y-6">
          {/* Logic View Sub-Header & Mode Bar */}
          <div className="bg-industrial-900 border border-industrial-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
            <div>
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Combinational Decision Logic & State Automaton
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Inspect how boolean signals <code className="text-cyan-300 font-mono">E = S ∧ (T ∨ M)</code> compute critical emergency outputs and drive controller state transitions.
              </p>
            </div>

            {/* Mode Selector: Live Sync vs Sandbox */}
            <div className="flex items-center space-x-2">
              <div className="flex bg-industrial-950 border border-industrial-800 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setLogicMode('LIVE_SYNC')}
                  className={`px-3 py-1.5 rounded transition-all font-bold flex items-center space-x-1.5 ${
                    logicMode === 'LIVE_SYNC'
                      ? 'bg-cyan-500 text-industrial-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Facility Live Sync</span>
                </button>
                <button
                  onClick={() => setLogicMode('SANDBOX')}
                  className={`px-3 py-1.5 rounded transition-all font-bold flex items-center space-x-1.5 ${
                    logicMode === 'SANDBOX'
                      ? 'bg-amber-500 text-industrial-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Sandbox Demonstration</span>
                </button>
              </div>

              {logicMode === 'LIVE_SYNC' && (
                <select
                  value={targetZoneId}
                  onChange={(e) => simulationStore.selectZone(e.target.value as ZoneId)}
                  className="bg-industrial-950 border border-industrial-800 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
                >
                  {(Object.keys(INITIAL_ZONE_CONFIGS) as ZoneId[]).map((zid) => (
                    <option key={zid} value={zid}>
                      Zone: {INITIAL_ZONE_CONFIGS[zid].name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Mode Explanatory Notice */}
          {logicMode === 'SANDBOX' ? (
            <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-amber-300 font-sans">
                <Sliders className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Independent Sandbox Mode Active:</strong> You can test all 8 input combinations below without modifying live facility incidents or corrupting investigation audit trails.
                </span>
              </div>
              <button
                onClick={handleApplySandboxToZone}
                className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-industrial-950 font-bold text-xs flex items-center space-x-1 shrink-0 transition-colors shadow-md"
              >
                <span>Apply to {targetZone?.config.name || 'Zone'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-3 bg-cyan-950/40 border border-cyan-800/80 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-cyan-300 font-sans">
                <Radio className="w-4 h-4 shrink-0 text-cyan-400 animate-pulse" />
                <span>
                  <strong>Live Synchronization:</strong> Inputs reflect current simulated telemetry in <strong className="text-white font-mono">{targetZone?.config.name}</strong>. Triggering incidents in the facility updates these signals in real time.
                </span>
              </div>
              <button
                onClick={() => setStudioView('INCIDENT_SIM')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
              >
                <span>Trigger Facility Incident</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* 1. Logic Circuit Visualizer (Fully interactive in both Live Sync and Sandbox) */}
          <LogicCircuitVisualizer
            smoke={displayedSmoke}
            tempHigh={displayedTempHigh}
            manualEmergency={displayedManual}
            isInteractive={true}
            onInputChange={logicMode === 'LIVE_SYNC' ? handleLiveInputChange : updateSandboxInputs}
            zoneName={logicMode === 'LIVE_SYNC' ? targetZone?.config.name : 'Sandbox Testbench'}
            subtitle={logicMode === 'LIVE_SYNC' ? 'Direct telemetry feed from facility digital twin (toggles update live zone)' : 'Independent DE testbench (preserves historical incident records)'}
            showTruthTableByDefault={true}
          />

          {/* 2. Compact Controller State Machine Visualizer (Responsive and Workable) */}
          <ControllerStateDiagram
            currentState={logicMode === 'LIVE_SYNC' ? simState.fsmState : sandboxFsmState}
            previousState={logicMode === 'LIVE_SYNC' ? (simState.previousFSMState || 'NORMAL') : sandboxPrevFsmState}
            lastTransition={logicMode === 'LIVE_SYNC' ? simState.lastFSMTransition : sandboxLastTransition}
            transitionHistory={logicMode === 'LIVE_SYNC' ? (simState.fsmTransitionHistory || []) : sandboxTransitionHistory}
            activeZoneId={targetZoneId}
            isSandbox={logicMode === 'SANDBOX'}
            onAcknowledge={
              logicMode === 'LIVE_SYNC'
                ? () => {
                    const activeInc = simState.incidents.find(i => !i.resolved);
                    if (activeInc) simulationStore.acknowledgeIncident(activeInc.id);
                  }
                : handleSandboxAcknowledge
            }
            onClearHazard={
              logicMode === 'LIVE_SYNC'
                ? () => simulationStore.clearHazardInZone(targetZoneId)
                : handleSandboxClearHazard
            }
            onReset={
              logicMode === 'LIVE_SYNC'
                ? () => simulationStore.resetSimulation()
                : handleSandboxReset
            }
            onTriggerEmergency={
              logicMode === 'LIVE_SYNC'
                ? handleTriggerConfluence
                : () => updateSandboxInputs({ smoke: true, tempHigh: true, manualEmergency: false })
            }
            onTriggerWarning={
              logicMode === 'LIVE_SYNC'
                ? handleTriggerSmoke
                : () => updateSandboxInputs({ smoke: true, tempHigh: false, manualEmergency: false })
            }
          />
        </div>
      )}
    </div>
  );
};
