/**
 * Central AEGIS Simulation Engine & State Store
 * Manages zones, sensors, digital logic calculations, FSM transitions,
 * event recording, time-travel history snapshots, and incident lifecycles.
 */

import { 
  ZoneId, 
  ZoneState, 
  ZoneConfig, 
  FSMState, 
  FSMTransitionRecord,
  IncidentRecord, 
  SimulationEvent, 
  EvacuationRouteResult,
  SeverityLevel,
  ZoneSensors,
  ZoneLogicOutputs,
  HistorySnapshot,
  ZoneResponseAction,
  ResponseActionType,
  TimingSignalSample,
} from '../types/simulation';
import { 
  evaluatePrimaryAlarmRule, 
  evaluateStage1WarningRule, 
  evaluateVentilationRule,
  NAND,
  NOR,
  evaluateNandOnlyOr,
} from '../logic/gates';
import { 
  evaluateComparatorWithHysteresis, 
  evaluateWindowComparator, 
  DEFAULT_THRESHOLDS 
} from '../logic/comparators';
import { 
  packageZoneTelemetry, 
  verifyTelemetryPacket 
} from '../logic/parity';
import { 
  priorityEncoder8to3 
} from '../logic/encoder';
import { 
  evaluateNextFSMState 
} from '../logic/fsm';
import { 
  calculateEvacuationRoute 
} from '../logic/routing';
import { audioService } from './audioService';

export const INITIAL_ZONE_CONFIGS: Record<ZoneId, ZoneConfig> = {
  ZONE_PROD: {
    id: 'ZONE_PROD',
    name: 'Production Hall',
    code: 'SEC-01',
    description: 'Heavy automated manufacturing bay with robotic welding cells, CNC milling lines, and conveyor networks.',
    primaryRisk: 'Mechanical jams, hydraulic friction heat, and localized electrical flashovers.',
    gridPosition: [-10, 0, -5],
    dimensions: [12, 5, 10],
    color: '#06b6d4',
    evacuationWaypoint: [-10, 0, 1],
  },
  ZONE_POWER: {
    id: 'ZONE_POWER',
    name: 'Power Room Substation',
    code: 'SEC-02',
    description: 'High-voltage transformer enclosure, capacitor banks, main switchgear, and backup diesel generator transfer switches.',
    primaryRisk: 'Transformer thermal overload, dielectric breakdown, and high-energy busbar arcing.',
    gridPosition: [-10, 0, 7],
    dimensions: [10, 5, 8],
    color: '#f59e0b',
    evacuationWaypoint: [-10, 0, 1],
  },
  ZONE_STORAGE: {
    id: 'ZONE_STORAGE',
    name: 'Chemical & Materials Storage',
    code: 'SEC-03',
    description: 'Tiered pallet racking containing combustible packaging, volatile solvent drums, and staging pallets.',
    primaryRisk: 'Rapid smoldering smoke generation, thermal runaways, and toxic volatile dispersion.',
    gridPosition: [6, 0, 7],
    dimensions: [14, 6, 8],
    color: '#ef4444',
    evacuationWaypoint: [6, 0, 1],
  },
  ZONE_CTRL: {
    id: 'ZONE_CTRL',
    name: 'Central Control Room',
    code: 'SEC-04',
    description: 'Pressurized supervisory command center housing operator multi-monitor consoles, SCADA servers, and main manual emergency trip switches.',
    primaryRisk: 'System override anomalies, operator panic overrides, and loss of automated fieldbus telemetry.',
    gridPosition: [6, 0, -5],
    dimensions: [10, 4, 8],
    color: '#3b82f6',
    evacuationWaypoint: [6, 0, 1],
  },
  ZONE_UTIL: {
    id: 'ZONE_UTIL',
    name: 'Utility & Compressor Zone',
    code: 'SEC-05',
    description: 'Industrial high-pressure pneumatic compressors, steam piping manifolds, chiller pumps, and pressure relief loops.',
    primaryRisk: 'Vessel over-pressurization, pneumatic line rupture, and thermal steam surges.',
    gridPosition: [-2, 0, 1],
    dimensions: [8, 5, 8],
    color: '#8b5cf6',
    evacuationWaypoint: [0, 0, 1],
  },
  ZONE_EXIT: {
    id: 'ZONE_EXIT',
    name: 'Emergency Exit Concourse',
    code: 'SEC-06',
    description: 'Positive-pressure smoke-proof stairwell, motorized fail-safe blast doors, emergency illumination, and assembly exit corridor.',
    primaryRisk: 'Corridor smoke ingress, exit obstruction, or magnetic door latch power failure.',
    gridPosition: [14, 0, 1],
    dimensions: [6, 4, 12],
    color: '#10b981',
    evacuationWaypoint: [16, 0, 1],
  },
};

export interface FaultInjectionState {
  zoneId: ZoneId | null;
  faultType: 'NONE' | 'STUCK_0' | 'STUCK_1' | 'PARITY_ERROR' | 'ANALOG_DRIFT';
  affectedSensor: 'smoke' | 'tempHigh' | 'pressureAnomaly' | 'manualEmergency';
}

export interface SimulationState {
  zones: Record<ZoneId, ZoneState>;
  fsmState: FSMState;
  previousFSMState: FSMState;
  lastFSMTransition: FSMTransitionRecord | null;
  fsmTransitionHistory: FSMTransitionRecord[];
  incidents: IncidentRecord[];
  events: SimulationEvent[];
  selectedZoneId: ZoneId | null;
  selectedIncidentId: string | null;
  simulationRunning: boolean;
  simulationSpeed: number; // 0.5, 1, 2, 5
  tickCount: number;
  uptimeSeconds: number;
  activeEvacuationRoute: EvacuationRouteResult | null;
  historySnapshots: HistorySnapshot[];
  faultInjection: FaultInjectionState;
  responseActions: Record<string, ZoneResponseAction>;
  clockRunning: boolean;
  clockFrequency: number;
  clockState: boolean;
  sequentialRegisterQ: boolean;
  timingHistory: TimingSignalSample[];
}

export function createDefaultResponseActions(): Record<string, ZoneResponseAction> {
  const actions: Record<string, ZoneResponseAction> = {};
  const zoneIds: ZoneId[] = ['ZONE_PROD', 'ZONE_POWER', 'ZONE_STORAGE', 'ZONE_CTRL', 'ZONE_UTIL', 'ZONE_EXIT'];

  zoneIds.forEach(zId => {
    const config = INITIAL_ZONE_CONFIGS[zId];
    const name = config.name;

    // 1. Sprinkler / Fire Suppression
    const isWaterSprinklerSafe = zId !== 'ZONE_POWER';
    actions[`ACT-SPRINKLER-${zId}`] = {
      id: `ACT-SPRINKLER-${zId}`,
      type: 'SPRINKLERS',
      name: `${name}: Fire Deluge Sprinklers`,
      zoneId: zId,
      status: 'STANDBY',
      progress: 0,
      activatedAt: null,
      completedAt: null,
      description: isWaterSprinklerSafe 
        ? 'High-pressure overhead water sprinkler heads & foam deluge loop.'
        : 'CO2 inert gas suppression bank (water sprinklers locked due to high-voltage equipment).',
      expectedEffect: 'Actively sprays fire suppressant, quenching flames and gradually lowering temperature and smoke.',
      isAvailable: true,
    };

    // 2. Smoke Ventilation & Air Extraction
    actions[`ACT-VENT-${zId}`] = {
      id: `ACT-VENT-${zId}`,
      type: 'VENTILATION',
      name: `${name}: High-Velocity Smoke Exhaust`,
      zoneId: zId,
      status: 'STANDBY',
      progress: 0,
      activatedAt: null,
      completedAt: null,
      description: 'Motorized ceiling exhaust dampers & high-flow industrial suction fans.',
      expectedEffect: 'Opens exhaust louvers and spins extractor fans, gradually expelling smoke and toxic combustion gases.',
      isAvailable: true,
    };

    // 3. Forced Thermal Cooling
    actions[`ACT-COOL-${zId}`] = {
      id: `ACT-COOL-${zId}`,
      type: 'COOLING',
      name: `${name}: Industrial Chiller Fans`,
      zoneId: zId,
      status: 'STANDBY',
      progress: 0,
      activatedAt: null,
      completedAt: null,
      description: 'Chilled refrigerant forced-air circulation and radiator cooling units.',
      expectedEffect: 'Activates auxiliary cooling fans, steadily bringing ambient and machinery heat down to safe levels.',
      isAvailable: true,
    };

    // 4. Power Isolation
    actions[`ACT-POWER-${zId}`] = {
      id: `ACT-POWER-${zId}`,
      type: 'POWER_ISOLATION',
      name: `${name}: Emergency Power Shunt Trip`,
      zoneId: zId,
      status: 'STANDBY',
      progress: 0,
      activatedAt: null,
      completedAt: null,
      description: 'Trips main motor contactors and isolates high-voltage electrical feed lines.',
      expectedEffect: 'De-energizes machinery, halting robotic cells and preventing electrical arc escalation.',
      isAvailable: true,
    };

    // 5. Emergency Alarm & Optical Strobe
    actions[`ACT-ALARM-${zId}`] = {
      id: `ACT-ALARM-${zId}`,
      type: 'ALARM_STROBE',
      name: `${name}: High-Intensity Emergency Strobe`,
      zoneId: zId,
      status: 'STANDBY',
      progress: 0,
      activatedAt: null,
      completedAt: null,
      description: 'Synchronized xenon optical strobe beacons and directional evacuation acoustic horns.',
      expectedEffect: 'Visibly flashes red emergency illumination and guides personnel toward nearest egress waypoints.',
      isAvailable: true,
    };
  });

  return actions;
}

type Listener = (state: SimulationState) => void;

class SimulationStore {
  private state: SimulationState;
  private listeners: Set<Listener> = new Set();
  private timer: number | null = null;
  private maxHistorySnapshots = 300;

  constructor() {
    this.state = this.getInitialState();
    this.recordSnapshot();
    this.startTicker();
  }

  private getInitialState(): SimulationState {
    const zones = {} as Record<ZoneId, ZoneState>;

    (Object.keys(INITIAL_ZONE_CONFIGS) as ZoneId[]).forEach(id => {
      zones[id] = {
        config: INITIAL_ZONE_CONFIGS[id],
        sensors: {
          smoke: false,
          smokeLevel: 4.5, // 4.5% baseline
          tempHigh: false,
          temperature: 24.2, // 24.2°C ambient
          pressureAnomaly: false,
          pressure: 88.0, // 88 PSI nominal
          manualEmergency: false,
          sensorFault: false,
          systemEnable: true,
        },
        outputs: {
          alarmStage1: false,
          alarmStage2: false,
          ventilationOverride: false,
          powerShutdown: false,
          exitDoorUnlock: false,
          parityValid: true,
          encodedPriority: 0,
        },
        status: 'NORMAL',
        activeIncidentId: null,
      };
    });

    const responseActions = createDefaultResponseActions();

    return {
      zones,
      fsmState: 'NORMAL',
      previousFSMState: 'NORMAL',
      lastFSMTransition: null,
      fsmTransitionHistory: [],
      incidents: [],
      events: [
        {
          id: 'EVT-INIT-001',
          timestamp: 0,
          category: 'SYSTEM',
          title: 'AEGIS Supervisory Engine Initialized',
          details: 'All 6 zones verified. Logic registers online. System armed in NORMAL state.',
          severity: 'INFO',
        }
      ],
      selectedZoneId: 'ZONE_PROD',
      selectedIncidentId: null,
      simulationRunning: true,
      simulationSpeed: 1.0,
      tickCount: 0,
      uptimeSeconds: 0,
      activeEvacuationRoute: calculateEvacuationRoute('ZONE_PROD', []),
      historySnapshots: [],
      faultInjection: {
        zoneId: null,
        faultType: 'NONE',
        affectedSensor: 'smoke',
      },
      responseActions,
      clockRunning: true,
      clockFrequency: 1.0,
      clockState: false,
      sequentialRegisterQ: false,
      timingHistory: [
        {
          id: 'sample-0',
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
          fsmState: 'NORMAL',
          sequentialRegisterQ: false,
        }
      ],
    };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  public getState(): SimulationState {
    return this.state;
  }

  private startTicker() {
    if (this.timer) clearInterval(this.timer);
    const intervalFn = typeof window !== 'undefined' ? window.setInterval : setInterval;
    this.timer = intervalFn(() => {
      if (this.state.simulationRunning) {
        this.tick();
      }
    }, 1000 / this.state.simulationSpeed) as any;
  }

  public setSpeed(speed: number) {
    this.state.simulationSpeed = speed;
    this.startTicker();
    this.notify();
  }

  public togglePlayPause() {
    this.state.simulationRunning = !this.state.simulationRunning;
    this.notify();
  }

  public stepTick() {
    this.tick();
  }

  /**
   * Deterministic Simulation Tick:
   * 1. Evaluates analog comparators with hysteresis
   * 2. Evaluates Digital Parity checks for telemetry packets
   * 3. Evaluates Combinational Logic Rules per zone
   * 4. Evaluates Priority Encoder
   * 5. Evaluates Finite State Machine Controller Next-State
   * 6. Evaluates Evacuation Route for selected zone
   * 7. Records events & snapshots
   */
  public tick() {
    this.state.tickCount += 1;
    this.state.uptimeSeconds += 1;

    let anyAlarmStage2 = false;
    let anyWarningStage1 = false;
    let anyManualPull = false;
    let anyFault = false;
    const hazardZones: ZoneId[] = [];

    const zoneAlertFlags: boolean[] = [false, false, false, false, false, false, false, false];

    // Evaluate each zone
    (Object.keys(this.state.zones) as ZoneId[]).forEach((zId, idx) => {
      const z = this.state.zones[zId];
      const s = { ...z.sensors };

      // Apply fault injection if configured
      if (this.state.faultInjection.zoneId === zId) {
        const { faultType, affectedSensor } = this.state.faultInjection;
        if (faultType === 'STUCK_0') {
          s[affectedSensor] = false;
        } else if (faultType === 'STUCK_1') {
          s[affectedSensor] = true;
        } else if (faultType === 'ANALOG_DRIFT') {
          if (affectedSensor === 'tempHigh') s.temperature += 2.0;
          if (affectedSensor === 'smoke') s.smokeLevel += 3.0;
        }
      }

      // Execute active response actions in this zone
      const sprinklerAction = this.state.responseActions[`ACT-SPRINKLER-${zId}`];
      if (sprinklerAction && sprinklerAction.status === 'ACTIVE') {
        sprinklerAction.progress = Math.min(100, sprinklerAction.progress + 8);
        if (s.smokeLevel > 4.5) s.smokeLevel = Math.max(4.5, s.smokeLevel - 3.5);
        if (s.temperature > 24.2) s.temperature = Math.max(24.2, s.temperature - 4.0);
        if (sprinklerAction.progress >= 100 && s.smokeLevel <= 5.0 && s.temperature <= 26.0) {
          sprinklerAction.status = 'COMPLETED';
          sprinklerAction.completedAt = Date.now();
          this.addEvent({
            category: 'SYSTEM',
            zoneId: zId,
            title: `Sprinkler Suppression Complete`,
            details: `Water deluge cycle completed in ${z.config.name}. Fire suppressed.`,
            severity: 'INFO',
          });
        }
      }

      const ventAction = this.state.responseActions[`ACT-VENT-${zId}`];
      if (ventAction && ventAction.status === 'ACTIVE') {
        ventAction.progress = Math.min(100, ventAction.progress + 7);
        if (s.smokeLevel > 4.5) s.smokeLevel = Math.max(4.5, s.smokeLevel - 4.5);
        if (ventAction.progress >= 100 && s.smokeLevel <= 5.0) {
          ventAction.status = 'COMPLETED';
          ventAction.completedAt = Date.now();
          this.addEvent({
            category: 'SYSTEM',
            zoneId: zId,
            title: `Smoke Ventilation Purge Complete`,
            details: `High-velocity exhaust purged toxic smoke in ${z.config.name}.`,
            severity: 'INFO',
          });
        }
      }

      const coolAction = this.state.responseActions[`ACT-COOL-${zId}`];
      if (coolAction && coolAction.status === 'ACTIVE') {
        coolAction.progress = Math.min(100, coolAction.progress + 6);
        if (s.temperature > 24.2) s.temperature = Math.max(24.2, s.temperature - 3.8);
        if (coolAction.progress >= 100 && s.temperature <= 26.0) {
          coolAction.status = 'COMPLETED';
          coolAction.completedAt = Date.now();
          this.addEvent({
            category: 'SYSTEM',
            zoneId: zId,
            title: `Thermal Cooling Complete`,
            details: `Forced-air cooling restored safe ambient temperature in ${z.config.name}.`,
            severity: 'INFO',
          });
        }
      }

      const powerAction = this.state.responseActions[`ACT-POWER-${zId}`];
      if (powerAction && powerAction.status === 'ACTIVE') {
        powerAction.progress = 100;
        z.outputs.powerShutdown = true;
      }

      // 1. Digital Comparators: Convert analog to digital
      s.smoke = evaluateComparatorWithHysteresis(
        s.smokeLevel,
        DEFAULT_THRESHOLDS.smokeHighPercent,
        DEFAULT_THRESHOLDS.smokeHysteresis,
        s.smoke
      );

      s.tempHigh = evaluateComparatorWithHysteresis(
        s.temperature,
        DEFAULT_THRESHOLDS.tempHighCelsius,
        DEFAULT_THRESHOLDS.tempHysteresis,
        s.tempHigh
      );

      s.pressureAnomaly = evaluateWindowComparator(
        s.pressure,
        DEFAULT_THRESHOLDS.pressureLowPsi,
        DEFAULT_THRESHOLDS.pressureHighPsi,
        s.pressureAnomaly
      );

      // 2. Parity Generator & Verification
      const injectParityError = this.state.faultInjection.zoneId === zId && this.state.faultInjection.faultType === 'PARITY_ERROR';
      const packet = packageZoneTelemetry(idx, s.smoke, s.tempHigh, s.pressureAnomaly, s.manualEmergency, s.systemEnable, injectParityError);
      const parityCheck = verifyTelemetryPacket(packet);

      if (!parityCheck.valid) {
        s.sensorFault = true;
      }

      // 3. Digital Combinational Logic Rules
      // Primary Rule: A = S AND (H OR M)
      const primaryEval = evaluatePrimaryAlarmRule(s.smoke, s.tempHigh, s.manualEmergency);
      const isCritical = primaryEval.alarmOutput || s.manualEmergency;
      const isWarning = evaluateStage1WarningRule(s.systemEnable, s.smoke, s.tempHigh, s.pressureAnomaly, s.manualEmergency);
      const ventilation = evaluateVentilationRule(s.systemEnable, s.smoke, s.tempHigh, s.sensorFault);

      // Update outputs
      z.outputs.alarmStage1 = isWarning && !isCritical;
      z.outputs.alarmStage2 = isCritical;
      z.outputs.ventilationOverride = ventilation;
      z.outputs.powerShutdown = isCritical && (zId === 'ZONE_POWER' || zId === 'ZONE_PROD');
      z.outputs.exitDoorUnlock = isCritical || this.state.fsmState === 'ALARM_STAGE_2';
      z.outputs.parityValid = parityCheck.valid;

      // Status determination
      if (s.sensorFault) {
        z.status = 'FAULT';
        anyFault = true;
      } else if (isCritical) {
        z.status = 'EMERGENCY';
        anyAlarmStage2 = true;
        hazardZones.push(zId);
        zoneAlertFlags[idx] = true;
      } else if (isWarning) {
        z.status = 'WARNING';
        anyWarningStage1 = true;
        zoneAlertFlags[idx] = true;
      } else {
        z.status = 'NORMAL';
      }

      if (s.manualEmergency) anyManualPull = true;

      // Check incident lifecycle for zone
      if (isCritical) {
        if (!z.activeIncidentId) {
          this.createIncidentForZone(zId, 'CRITICAL', primaryEval.booleanExpression);
        } else {
          // Prevent duplicate incidents: escalate existing incident if it was warning
          const existing = this.state.incidents.find(i => i.id === z.activeIncidentId);
          if (existing && existing.severity !== 'CRITICAL') {
            existing.severity = 'CRITICAL';
            existing.title = `${z.config.name}: Alarm Stage 2 Emergency`;
            existing.triggeringInputs = { ...s };
            existing.calculatedOutputs = { ...z.outputs };
            existing.fsmStateSnapshot = this.state.fsmState;
            existing.historyTimeline.push({
              timestamp: Date.now(),
              action: 'Incident Escalated to Critical Confluence',
              description: `Logic rule tripped: ${primaryEval.booleanExpression}`,
              user: 'AEGIS Controller Engine',
            });
            this.addEvent({
              category: 'ALARM',
              zoneId: zId,
              title: `Incident ${existing.id} Escalated`,
              details: `Critical confluence: ${primaryEval.booleanExpression}`,
              severity: 'CRITICAL',
            });
          } else if (existing) {
            existing.triggeringInputs = { ...s };
            existing.calculatedOutputs = { ...z.outputs };
          }
        }
      } else if (isWarning) {
        if (!z.activeIncidentId) {
          this.createIncidentForZone(zId, 'MEDIUM', 'Pre-alarm warning condition');
        } else {
          const existing = this.state.incidents.find(i => i.id === z.activeIncidentId);
          if (existing) {
            existing.triggeringInputs = { ...s };
            existing.calculatedOutputs = { ...z.outputs };
          }
        }
      } else {
        // Physical sensors nominal in this zone
        if (z.activeIncidentId) {
          const existing = this.state.incidents.find(i => i.id === z.activeIncidentId);
          if (existing && (existing.status === 'DETECTED' || existing.status === 'ACTIVE')) {
            existing.status = 'CONDITION_CLEARED';
            existing.clearedAt = Date.now();
            existing.historyTimeline.push({
              timestamp: Date.now(),
              action: 'Hazard Cleared (Sensors Normalized)',
              description: 'Sensors in zone returned below trip thresholds',
              user: 'Safety Verification Subsystem',
            });
          }
        }
      }

      z.sensors = s;
    });

    // 4. Priority Encoder (Identify highest-priority active channel)
    const priorityResult = priorityEncoder8to3(zoneAlertFlags);
    if (priorityResult.hasActiveInput) {
      const activeIdx = priorityResult.encodedCode;
      const zoneIds = Object.keys(this.state.zones) as ZoneId[];
      if (zoneIds[activeIdx]) {
        this.state.zones[zoneIds[activeIdx]].outputs.encodedPriority = activeIdx;
      }
    }

    // 5. Finite State Machine Next-State Evaluation
    const allHazardsCleared = !anyAlarmStage2 && !anyWarningStage1 && !anyManualPull;
    const previousFSM = this.state.fsmState;

    const fsmResult = evaluateNextFSMState(previousFSM, {
      alarmStage2Active: anyAlarmStage2,
      warningStage1Active: anyWarningStage1,
      manualPullActive: anyManualPull,
      sensorFaultActive: anyFault,
      allHazardsCleared,
      isAcknowledged: this.isAnyIncidentAcknowledged(),
      recoveryTimerCompleted: this.state.tickCount % 10 === 0,
      supervisorOverride: false,
      resetRequested: false,
    });

    if (fsmResult.toState !== previousFSM) {
      const transitionRecord: FSMTransitionRecord = {
        fromState: previousFSM,
        toState: fsmResult.toState,
        reason: fsmResult.reason,
        timestamp: Date.now(),
        simTime: this.state.uptimeSeconds,
        triggeringZoneId: hazardZones[0],
      };

      this.state.previousFSMState = previousFSM;
      this.state.fsmState = fsmResult.toState;
      this.state.lastFSMTransition = transitionRecord;
      this.state.fsmTransitionHistory.unshift(transitionRecord);
      if (this.state.fsmTransitionHistory.length > 25) {
        this.state.fsmTransitionHistory.pop();
      }

      this.addEvent({
        category: 'CONTROLLER',
        title: `Controller State: ${previousFSM} ➔ ${fsmResult.toState}`,
        details: fsmResult.reason,
        severity: fsmResult.toState === 'ALARM_STAGE_2' ? 'CRITICAL' : fsmResult.toState === 'WARNING' ? 'WARNING' : 'INFO',
      });

      // Manage procedural audio
      if (fsmResult.toState === 'ALARM_STAGE_2') {
        audioService.startEmergencySiren();
      } else if (fsmResult.toState === 'WARNING') {
        audioService.playWarning();
      } else if (fsmResult.toState === 'NORMAL') {
        audioService.stopAlarm();
      }
    }

    // 6. Recalculate Evacuation Route if active zone selected
    if (this.state.selectedZoneId) {
      this.state.activeEvacuationRoute = calculateEvacuationRoute(this.state.selectedZoneId, hazardZones);
    }

    // 7. Advance Clock & Sample Digital Timing Waveforms
    const prevClock = this.state.clockState;
    if (this.state.clockRunning) {
      // Periodic clock pulse toggles each tick
      this.state.clockState = !this.state.clockState;
    }
    const currentClock = this.state.clockState;

    // Sequential D Flip-Flop: On rising clock edge (0 -> 1), latch D input
    const targetZoneId = this.state.selectedZoneId || 'ZONE_PROD';
    const activeZone = this.state.zones[targetZoneId];
    if (!prevClock && currentClock && activeZone) {
      this.state.sequentialRegisterQ = activeZone.sensors.smoke;
    }

    if (activeZone) {
      const inputA = activeZone.sensors.smoke;
      const inputB = activeZone.sensors.tempHigh;
      const sample: TimingSignalSample = {
        id: `sample-${this.state.tickCount}`,
        timestamp: this.state.uptimeSeconds,
        clock: currentClock,
        inputA,
        inputB,
        smoke: inputA,
        tempHigh: inputB,
        manualEmergency: activeZone.sensors.manualEmergency,
        nandOut: NAND(inputA, inputB),
        norOut: NOR(inputA, inputB),
        selectedCombOut: evaluateNandOnlyOr(inputA, inputB).output,
        primaryAlarmOut: activeZone.outputs.alarmStage2,
        fsmState: this.state.fsmState,
        sequentialRegisterQ: this.state.sequentialRegisterQ,
      };

      this.state.timingHistory.push(sample);
      if (this.state.timingHistory.length > 60) {
        this.state.timingHistory.shift();
      }
    }

    // 8. Store time-travel snapshot
    this.recordSnapshot();

    this.notify();
  }

  public recordSnapshot() {
    const zoneSnapshots = {} as Record<ZoneId, { sensors: ZoneSensors; outputs: ZoneLogicOutputs; status: any }>;
    (Object.keys(this.state.zones) as ZoneId[]).forEach(id => {
      zoneSnapshots[id] = {
        sensors: { ...this.state.zones[id].sensors },
        outputs: { ...this.state.zones[id].outputs },
        status: this.state.zones[id].status,
      };
    });

    const hazardZones = (Object.keys(this.state.zones) as ZoneId[]).filter(
      zId => this.state.zones[zId].status === 'EMERGENCY' || this.state.zones[zId].status === 'WARNING'
    );

    const snapshot: HistorySnapshot = {
      tick: this.state.tickCount,
      timestamp: Date.now(),
      simTime: this.state.uptimeSeconds,
      fsmState: this.state.fsmState,
      previousFSMState: this.state.previousFSMState,
      lastFSMTransition: this.state.lastFSMTransition ? { ...this.state.lastFSMTransition } : null,
      zones: zoneSnapshots,
      affectedZones: hazardZones,
      activeIncidentId: this.state.selectedIncidentId,
      events: this.state.events.map(e => ({ ...e })),
      responseActions: Object.fromEntries(Object.entries(this.state.responseActions).map(([k, v]) => [k, { ...v }])),
    };

    this.state.historySnapshots.push(snapshot);
    if (this.state.historySnapshots.length > this.maxHistorySnapshots) {
      this.state.historySnapshots.shift();
    }
  }

  private isAnyIncidentAcknowledged(): boolean {
    return this.state.incidents.some(inc => inc.status === 'ACKNOWLEDGED' || inc.status === 'UNDER_INVESTIGATION' || inc.status === 'CONDITION_CLEARED');
  }

  private createIncidentForZone(zoneId: ZoneId, severity: SeverityLevel, logicExplanation: string) {
    const zone = this.state.zones[zoneId];
    const incId = `INC-${Date.now().toString().slice(-6)}`;
    const newIncident: IncidentRecord = {
      id: incId,
      scenarioType: severity === 'CRITICAL' ? 'Critical Emergency Confluence' : 'Warning Condition',
      title: `${zone.config.name}: ${severity === 'CRITICAL' ? 'Alarm Stage 2 Emergency' : 'Stage 1 Warning'}`,
      zoneId,
      zoneName: zone.config.name,
      severity,
      detectedAt: Date.now(),
      acknowledgedAt: null,
      clearedAt: null,
      closedAt: null,
      status: 'DETECTED',
      triggeringInputs: { ...zone.sensors },
      calculatedOutputs: { ...zone.outputs },
      fsmStateSnapshot: this.state.fsmState,
      operatorNotes: [`Simulated incident logged by AEGIS Digital Twin engine. Calculated logic: ${logicExplanation}`],
      resolved: false,
      historyTimeline: [
        {
          timestamp: Date.now(),
          action: 'Incident Detected',
          description: `Logic rule tripped in ${zone.config.name}`,
          user: 'AEGIS Controller Engine',
        }
      ],
    };

    zone.activeIncidentId = incId;
    this.state.incidents.unshift(newIncident);
    this.state.selectedIncidentId = incId;

    this.addEvent({
      category: 'ALARM',
      zoneId,
      title: `Simulated Incident ${incId} Detected`,
      details: `${newIncident.title} — Severity: ${severity}`,
      severity: severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
    });
  }

  public addEvent(event: Omit<SimulationEvent, 'id' | 'timestamp'>) {
    const newEvent: SimulationEvent = {
      id: `EVT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`,
      timestamp: this.state.uptimeSeconds,
      ...event,
    };
    this.state.events.unshift(newEvent);
    if (this.state.events.length > 150) {
      this.state.events.pop();
    }
  }

  public selectZone(zoneId: ZoneId) {
    this.state.selectedZoneId = zoneId;
    const hazardZones = (Object.keys(this.state.zones) as ZoneId[]).filter(zId => this.state.zones[zId].status === 'EMERGENCY');
    this.state.activeEvacuationRoute = calculateEvacuationRoute(zoneId, hazardZones);
    audioService.playClick();
    this.notify();
  }

  public selectIncident(incidentId: string | null) {
    this.state.selectedIncidentId = incidentId;
    this.notify();
  }

  /**
   * Toggle Boolean Sensor Input manually
   */
  public toggleSensor(zoneId: ZoneId, sensorKey: keyof ZoneSensors) {
    const zone = this.state.zones[zoneId];
    if (!zone) return;

    if (sensorKey in zone.sensors) {
      const current = (zone.sensors as any)[sensorKey];
      (zone.sensors as any)[sensorKey] = !current;

      // If turning on smoke or temp, adjust analog levels accordingly
      if (sensorKey === 'smoke') {
        zone.sensors.smokeLevel = !current ? 45.0 : 4.0;
      } else if (sensorKey === 'tempHigh') {
        zone.sensors.temperature = !current ? 78.0 : 25.0;
      } else if (sensorKey === 'pressureAnomaly') {
        zone.sensors.pressure = !current ? 140.0 : 88.0;
      }

      this.addEvent({
        category: 'SENSOR',
        zoneId,
        title: `Manual Sensor Toggle: ${sensorKey.toString()}`,
        details: `${zone.config.name} ${sensorKey.toString()} changed to ${!current ? 'HIGH (1)' : 'LOW (0)'}`,
        severity: !current ? 'WARNING' : 'INFO',
      });

      audioService.playClick();
      this.tick();
    }
  }

  /**
   * Set Analog Sensor Input Level
   */
  public setAnalogLevel(zoneId: ZoneId, sensorType: 'smokeLevel' | 'temperature' | 'pressure', value: number) {
    const zone = this.state.zones[zoneId];
    if (!zone) return;

    zone.sensors[sensorType] = value;
    this.tick();
  }

  /**
   * Manual Emergency Pull Station trip
   */
  public triggerEmergencyPull(zoneId: ZoneId) {
    const zone = this.state.zones[zoneId];
    if (!zone) return;

    zone.sensors.manualEmergency = true;
    this.addEvent({
      category: 'OPERATOR',
      zoneId,
      title: `Emergency Manual Pull Station Tripped!`,
      details: `Operator or occupant pulled emergency alarm station in ${zone.config.name}`,
      severity: 'CRITICAL',
    });
    audioService.playWarning();
    this.tick();
  }

  /**
   * Operator Incident Acknowledge
   */
  public acknowledgeIncident(incidentId: string) {
    const inc = this.state.incidents.find(i => i.id === incidentId);
    if (!inc) return;

    inc.status = 'ACKNOWLEDGED';
    inc.acknowledgedAt = Date.now();
    inc.historyTimeline.push({
      timestamp: Date.now(),
      action: 'Incident Acknowledged',
      description: 'Operator acknowledged simulated alert. Klaxon muted, heightened monitoring.',
      user: 'Supervisory Operator (Station 01)',
    });

    this.addEvent({
      category: 'OPERATOR',
      zoneId: inc.zoneId,
      title: `Incident ${inc.id} Acknowledged`,
      details: `Operator acknowledged alert for ${inc.zoneName}`,
      severity: 'INFO',
    });

    audioService.playAcknowledge();
    this.tick();
  }

  /**
   * Operator Adds Investigation Note
   */
  public addIncidentNote(incidentId: string, note: string) {
    const inc = this.state.incidents.find(i => i.id === incidentId);
    if (!inc || !note.trim()) return;

    inc.operatorNotes.push(`[${new Date().toLocaleTimeString()}] ${note.trim()}`);
    inc.historyTimeline.push({
      timestamp: Date.now(),
      action: 'Investigation Note Added',
      description: note.trim(),
      user: 'Lead Forensics Investigator',
    });
    this.notify();
  }

  /**
   * Clear Physical Hazard in Zone (Simulate extinguishing fire / venting pressure)
   */
  public clearHazardInZone(zoneId: ZoneId) {
    const zone = this.state.zones[zoneId];
    if (!zone) return;

    zone.sensors.smoke = false;
    zone.sensors.smokeLevel = 4.0;
    zone.sensors.tempHigh = false;
    zone.sensors.temperature = 24.0;
    zone.sensors.pressureAnomaly = false;
    zone.sensors.pressure = 88.0;
    zone.sensors.manualEmergency = false;
    zone.sensors.sensorFault = false;

    // Check incident
    if (zone.activeIncidentId) {
      const inc = this.state.incidents.find(i => i.id === zone.activeIncidentId);
      if (inc) {
        inc.status = 'CONDITION_CLEARED';
        inc.clearedAt = Date.now();
        inc.historyTimeline.push({
          timestamp: Date.now(),
          action: 'Hazard Cleared',
          description: 'Physical sensors confirmed back within nominal parameters',
          user: 'Safety Verification Subsystem',
        });
      }
    }

    this.addEvent({
      category: 'LOGIC',
      zoneId,
      title: `Hazard Cleared in ${zone.config.name}`,
      details: 'All sensor inputs returned below threshold levels.',
      severity: 'INFO',
    });

    this.tick();
  }

  /**
   * Complete Incident Recovery & Closure
   */
  public closeIncident(incidentId: string) {
    const inc = this.state.incidents.find(i => i.id === incidentId);
    if (!inc) return;

    const zone = this.state.zones[inc.zoneId];
    // Guard: Cannot close if physical hazard still active!
    if (zone.status === 'EMERGENCY' || zone.status === 'WARNING') {
      this.addEvent({
        category: 'OPERATOR',
        zoneId: inc.zoneId,
        title: 'Closure Rejected: Active Hazard Detected',
        details: 'Cannot close incident while sensors still detect emergency/warning conditions!',
        severity: 'CRITICAL',
      });
      return;
    }

    inc.status = 'CLOSED';
    inc.closedAt = Date.now();
    inc.resolved = true;
    inc.historyTimeline.push({
      timestamp: Date.now(),
      action: 'Incident Closed & Archived',
      description: 'Purge sequence completed and safety verification signed off.',
      user: 'Operations Supervisor',
    });

    zone.activeIncidentId = null;

    this.addEvent({
      category: 'OPERATOR',
      zoneId: inc.zoneId,
      title: `Incident ${inc.id} Closed`,
      details: `Full recovery confirmed. Archive report generated.`,
      severity: 'INFO',
    });

    this.tick();
  }

  /**
   * Reset Entire Simulation to Clean Baseline
   */
  public resetSimulation() {
    audioService.stopAlarm();
    this.state = this.getInitialState();
    this.addEvent({
      category: 'SYSTEM',
      title: 'Simulation Reset Executed',
      details: 'Facility digital twin restored to nominal baseline. All registers re-armed.',
      severity: 'INFO',
    });
    this.recordSnapshot();
    this.notify();
  }

  /**
   * Explicitly clear historical snapshots
   */
  public clearHistory() {
    this.state.historySnapshots = [];
    this.notify();
  }

  /**
   * Fault Injection helper
   */
  public setFaultInjection(fault: FaultInjectionState) {
    this.state.faultInjection = fault;
    this.addEvent({
      category: 'SYSTEM',
      title: `Fault Injection Configured: ${fault.faultType}`,
      details: fault.faultType === 'NONE' 
        ? 'All diagnostic test lines restored to nominal operation.' 
        : `Injected ${fault.faultType} on ${fault.affectedSensor} in ${fault.zoneId}`,
      severity: fault.faultType === 'NONE' ? 'INFO' : 'WARNING',
    });
    this.tick();
  }

  /**
   * Activate an industrial emergency response action (Sprinklers, Ventilation, Cooling, etc.)
   */
  public activateResponseAction(actionId: string) {
    const action = this.state.responseActions[actionId];
    if (!action) return;

    if (!action.isAvailable) {
      this.addEvent({
        category: 'OPERATOR',
        zoneId: action.zoneId,
        title: `Response Action Unavailable: ${action.name}`,
        details: action.unavailableReason || 'Action cannot be activated under current configuration.',
        severity: 'WARNING',
      });
      return;
    }

    action.status = 'ACTIVE';
    action.activatedAt = Date.now();
    action.progress = Math.max(10, action.progress);

    // If there is an active incident in this zone, record in timeline
    const zone = this.state.zones[action.zoneId];
    if (zone && zone.activeIncidentId) {
      const inc = this.state.incidents.find(i => i.id === zone.activeIncidentId);
      if (inc) {
        inc.historyTimeline.push({
          timestamp: Date.now(),
          action: `Response Activated: ${action.name}`,
          description: `Operator triggered ${action.name}. Environmental suppression initiated.`,
          user: 'Operations Supervisor',
        });
      }
    }

    this.addEvent({
      category: 'OPERATOR',
      zoneId: action.zoneId,
      title: `Response Activated: ${action.name}`,
      details: `${action.name} is now ACTIVE in ${zone?.config.name || action.zoneId}.`,
      severity: 'INFO',
    });

    audioService.playClick();
    this.tick();
  }

  /**
   * Deactivate a running response action
   */
  public deactivateResponseAction(actionId: string) {
    const action = this.state.responseActions[actionId];
    if (!action) return;

    action.status = 'STANDBY';
    const zone = this.state.zones[action.zoneId];

    if (zone && zone.activeIncidentId) {
      const inc = this.state.incidents.find(i => i.id === zone.activeIncidentId);
      if (inc) {
        inc.historyTimeline.push({
          timestamp: Date.now(),
          action: `Response Deactivated: ${action.name}`,
          description: `Operator placed ${action.name} back to STANDBY.`,
          user: 'Operations Supervisor',
        });
      }
    }

    this.addEvent({
      category: 'OPERATOR',
      zoneId: action.zoneId,
      title: `Response Deactivated: ${action.name}`,
      details: `${action.name} returned to STANDBY.`,
      severity: 'INFO',
    });

    audioService.playClick();
    this.tick();
  }

  /**
   * Reset a response action's progress to 0 and STANDBY
   */
  public resetResponseAction(actionId: string) {
    const action = this.state.responseActions[actionId];
    if (!action) return;

    action.status = 'STANDBY';
    action.progress = 0;
    action.activatedAt = null;
    action.completedAt = null;
    this.notify();
  }

  /**
   * Clock Controls for Digital Electronics Timing Diagram
   */
  public toggleClockRunning() {
    this.state.clockRunning = !this.state.clockRunning;
    this.notify();
  }

  public setClockFrequency(freq: number) {
    this.state.clockFrequency = freq;
    this.notify();
  }

  public singleStepClockPulse() {
    // Generate full clock pulse: 0 -> 1 -> 0 and trigger D-FF sequential update
    const targetZoneId = this.state.selectedZoneId || 'ZONE_PROD';
    const activeZone = this.state.zones[targetZoneId];
    
    // Rising edge: latch D
    this.state.clockState = true;
    if (activeZone) {
      this.state.sequentialRegisterQ = activeZone.sensors.smoke;
    }

    const inputA = activeZone ? activeZone.sensors.smoke : false;
    const inputB = activeZone ? activeZone.sensors.tempHigh : false;

    const sampleHigh: TimingSignalSample = {
      id: `sample-${this.state.tickCount}-high`,
      timestamp: this.state.uptimeSeconds + 0.5,
      clock: true,
      inputA,
      inputB,
      smoke: inputA,
      tempHigh: inputB,
      manualEmergency: activeZone ? activeZone.sensors.manualEmergency : false,
      nandOut: NAND(inputA, inputB),
      norOut: NOR(inputA, inputB),
      selectedCombOut: evaluateNandOnlyOr(inputA, inputB).output,
      primaryAlarmOut: activeZone ? activeZone.outputs.alarmStage2 : false,
      fsmState: this.state.fsmState,
      sequentialRegisterQ: this.state.sequentialRegisterQ,
    };
    this.state.timingHistory.push(sampleHigh);

    // Falling edge
    this.state.clockState = false;
    const sampleLow: TimingSignalSample = {
      ...sampleHigh,
      id: `sample-${this.state.tickCount}-low`,
      timestamp: this.state.uptimeSeconds + 1.0,
      clock: false,
    };
    this.state.timingHistory.push(sampleLow);

    if (this.state.timingHistory.length > 60) {
      this.state.timingHistory = this.state.timingHistory.slice(-60);
    }

    this.notify();
  }

  public clearTimingHistory() {
    this.state.timingHistory = [];
    this.notify();
  }
}

export const simulationStore = new SimulationStore();
