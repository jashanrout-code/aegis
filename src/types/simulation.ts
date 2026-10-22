export type SeverityLevel = 'NORMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ZoneId = 
  | 'ZONE_PROD'    // Production Hall
  | 'ZONE_POWER'   // Power Room
  | 'ZONE_STORAGE' // Storage Area
  | 'ZONE_CTRL'    // Control Room
  | 'ZONE_UTIL'    // Utility Zone
  | 'ZONE_EXIT';   // Emergency Exit Area

export interface ZoneConfig {
  id: ZoneId;
  name: string;
  code: string;
  description: string;
  primaryRisk: string;
  gridPosition: [number, number, number]; // [x, y, z] in 3D world
  dimensions: [number, number, number];   // [width, height, depth]
  color: string;
  evacuationWaypoint: [number, number, number];
}

export interface ZoneSensors {
  smoke: boolean;             // Digital signal S (Smoke threshold exceeded)
  smokeLevel: number;         // Analog measurement in % obscuration (0-100)
  tempHigh: boolean;          // Digital signal H (High Temperature exceeded)
  temperature: number;        // Analog measurement in °C (0-150)
  pressureAnomaly: boolean;   // Digital signal P (Pressure outside safe boundary)
  pressure: number;           // Analog measurement in PSI (0-200)
  manualEmergency: boolean;   // Digital signal M (Manual Emergency Pull Station)
  sensorFault: boolean;       // Fault line F (Stuck, disconnect or parity error)
  systemEnable: boolean;      // Enable signal EN (Safety subsystem armed)
}

export interface ZoneLogicOutputs {
  alarmStage1: boolean;       // Visual warning / strobe
  alarmStage2: boolean;       // Full evacuation klaxon & sprinkler/suppression release
  ventilationOverride: boolean;// Smoke exhaust dampers open
  powerShutdown: boolean;     // Emergency electrical shunt trip
  exitDoorUnlock: boolean;    // Fail-safe magnetic door release
  parityValid: boolean;       // Telemetry packet checksum integrity
  encodedPriority: number;    // Priority encoder binary output (0-7)
}

export interface ZoneState {
  config: ZoneConfig;
  sensors: ZoneSensors;
  outputs: ZoneLogicOutputs;
  status: 'NORMAL' | 'WARNING' | 'EMERGENCY' | 'FAULT';
  activeIncidentId: string | null;
}

export type FSMState = 
  | 'NORMAL'            // All zones safe, all outputs nominal
  | 'MONITORING'        // Subtle telemetry fluctuation, logic active
  | 'WARNING'           // Warning condition detected, stage 1 beacon
  | 'ALARM_STAGE_1'     // Confirmed single hazard, localized response
  | 'ALARM_STAGE_2'     // Critical dual hazard or manual pull, full evacuation
  | 'RECOVERY'          // Hazard cleared, sequential system re-arm & ventilation purge
  | 'FAULT'             // Telemetry parity error or sensor stuck
  | 'OVERRIDE';         // Authorized manual supervisor override

export interface FSMTransitionRecord {
  fromState: FSMState;
  toState: FSMState;
  reason: string;
  timestamp: number;
  simTime: number;
  triggeringZoneId?: ZoneId;
}

export type IncidentStatus = 
  | 'DETECTED'
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'UNDER_INVESTIGATION'
  | 'CONDITION_CLEARED'
  | 'RECOVERY'
  | 'CLOSED';

export interface IncidentRecord {
  id: string;
  scenarioType: string;
  title: string;
  zoneId: ZoneId;
  zoneName: string;
  severity: SeverityLevel;
  detectedAt: number;        // timestamp
  acknowledgedAt: number | null;
  clearedAt: number | null;
  closedAt: number | null;
  status: IncidentStatus;
  triggeringInputs: Partial<ZoneSensors>;
  calculatedOutputs: Partial<ZoneLogicOutputs>;
  fsmStateSnapshot: FSMState;
  operatorNotes: string[];
  resolved: boolean;
  historyTimeline: {
    timestamp: number;
    action: string;
    description: string;
    user: string;
  }[];
}

export interface SimulationEvent {
  id: string;
  timestamp: number;         // Relative simulation time (seconds) or wall-clock
  category: 'SENSOR' | 'LOGIC' | 'CONTROLLER' | 'ALARM' | 'OPERATOR' | 'SYSTEM';
  zoneId?: ZoneId;
  title: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'FAULT';
  dataSnapshot?: Record<string, any>;
}

export interface EvacuationRouteResult {
  routeFound: boolean;
  waypoints: [number, number, number][];
  blockedCorridors: string[];
  nearestExit: string;
  totalDistanceMeters: number;
  evacuationEstimatedSeconds: number;
}

export interface HistorySnapshot {
  tick: number;
  timestamp: number;
  simTime: number;
  fsmState: FSMState;
  previousFSMState?: FSMState;
  lastFSMTransition?: FSMTransitionRecord | null;
  zones: Record<ZoneId, {
    sensors: ZoneSensors;
    outputs: ZoneLogicOutputs;
    status: 'NORMAL' | 'WARNING' | 'EMERGENCY' | 'FAULT';
  }>;
  affectedZones: ZoneId[];
  activeIncidentId: string | null;
  events: SimulationEvent[];
}
