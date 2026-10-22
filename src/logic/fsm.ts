/**
 * Finite-State Machine (FSM) Controller for AEGIS Industrial Emergency Monitoring
 * Implements deterministic sequential control logic with state registers, valid transition guards,
 * and escalation rules.
 */

import { FSMState } from '../types/simulation';

export interface FSMTransitionResult {
  fromState: FSMState;
  toState: FSMState;
  allowed: boolean;
  reason: string;
  timestamp: number;
}

export interface FSMInputConditions {
  alarmStage2Active: boolean;     // Calculated A = S AND (H OR M)
  warningStage1Active: boolean;   // Single sensor pre-alarm
  manualPullActive: boolean;      // Direct manual pull
  sensorFaultActive: boolean;     // Diagnostic parity or hardware fault
  allHazardsCleared: boolean;     // All physical signals below trip thresholds
  isAcknowledged: boolean;        // Operator has signed off
  recoveryTimerCompleted: boolean;// Purge/re-arm sequence finished
  supervisorOverride: boolean;    // Manual bypass
  resetRequested: boolean;        // Operator pressed system reset
}

/**
 * State Transition Table & Next-State Logic:
 * Evaluates the next controller state based on current state and input vectors.
 */
export function evaluateNextFSMState(
  currentState: FSMState,
  inputs: FSMInputConditions
): FSMTransitionResult {
  const now = Date.now();

  // Rule 0: Critical Emergency Pull or Dual Hazard always takes immediate priority
  if (inputs.manualPullActive || inputs.alarmStage2Active) {
    if (currentState !== 'ALARM_STAGE_2') {
      let reason = 'Critical confluence detected: A = S ∧ (H ∨ M) is HIGH';
      if (currentState === 'RECOVERY') {
        reason = 'CRITICAL: Secondary hazard re-ignited during recovery sequence! Immediate re-escalation.';
      } else if (inputs.manualPullActive) {
        reason = 'Emergency Manual Pull Station activated — Immediate Stage 2 Escalation';
      }
      return {
        fromState: currentState,
        toState: 'ALARM_STAGE_2',
        allowed: true,
        reason,
        timestamp: now,
      };
    }
    // Already in Stage 2
    return {
      fromState: currentState,
      toState: 'ALARM_STAGE_2',
      allowed: true,
      reason: 'Persistent Critical Hazard condition',
      timestamp: now,
    };
  }

  // Rule 1: Fault state (Parity error, wire disconnect)
  if (inputs.sensorFaultActive && currentState !== 'ALARM_STAGE_2') {
    if (currentState !== 'FAULT') {
      return {
        fromState: currentState,
        toState: 'FAULT',
        allowed: true,
        reason: 'Diagnostic telemetry parity error or sensor hardware fault detected',
        timestamp: now,
      };
    }
    return {
      fromState: currentState,
      toState: 'FAULT',
      allowed: true,
      reason: 'Fault condition persists',
      timestamp: now,
    };
  }

  // Rule 2: Supervisor Override
  if (inputs.supervisorOverride) {
    return {
      fromState: currentState,
      toState: 'OVERRIDE',
      allowed: true,
      reason: 'Manual supervisor key switch engaged',
      timestamp: now,
    };
  }

  // State-specific Sequential Transitions
  switch (currentState) {
    case 'NORMAL':
      if (inputs.warningStage1Active) {
        return {
          fromState: 'NORMAL',
          toState: 'WARNING',
          allowed: true,
          reason: 'Pre-alarm threshold exceeded in monitored zone',
          timestamp: now,
        };
      }
      return {
        fromState: 'NORMAL',
        toState: 'NORMAL',
        allowed: true,
        reason: 'Facility conditions nominal',
        timestamp: now,
      };

    case 'WARNING':
      if (inputs.allHazardsCleared) {
        return {
          fromState: 'WARNING',
          toState: 'NORMAL',
          allowed: true,
          reason: 'Warning conditions returned to nominal band',
          timestamp: now,
        };
      }
      if (inputs.isAcknowledged) {
        return {
          fromState: 'WARNING',
          toState: 'MONITORING',
          allowed: true,
          reason: 'Warning acknowledged by operator — heightened telemetry monitoring',
          timestamp: now,
        };
      }
      return {
        fromState: 'WARNING',
        toState: 'WARNING',
        allowed: true,
        reason: 'Active warning condition unacknowledged',
        timestamp: now,
      };

    case 'MONITORING':
      if (inputs.warningStage1Active) {
        return {
          fromState: 'MONITORING',
          toState: 'WARNING',
          allowed: true,
          reason: 'Warning condition re-triggered',
          timestamp: now,
        };
      }
      if (inputs.allHazardsCleared) {
        return {
          fromState: 'MONITORING',
          toState: 'NORMAL',
          allowed: true,
          reason: 'All monitored parameters stabilized within nominal boundaries',
          timestamp: now,
        };
      }
      return {
        fromState: 'MONITORING',
        toState: 'MONITORING',
        allowed: true,
        reason: 'Monitoring active telemetry',
        timestamp: now,
      };

    case 'ALARM_STAGE_1':
      if (inputs.allHazardsCleared && inputs.isAcknowledged) {
        return {
          fromState: 'ALARM_STAGE_1',
          toState: 'RECOVERY',
          allowed: true,
          reason: 'Hazard cleared and acknowledged — initiating ventilation purge and recovery',
          timestamp: now,
        };
      }
      return {
        fromState: 'ALARM_STAGE_1',
        toState: 'ALARM_STAGE_1',
        allowed: true,
        reason: 'Stage 1 alarm active',
        timestamp: now,
      };

    case 'ALARM_STAGE_2':
      // CANNOT clear directly while hazard is active!
      if (inputs.resetRequested && !inputs.allHazardsCleared) {
        return {
          fromState: 'ALARM_STAGE_2',
          toState: 'ALARM_STAGE_2',
          allowed: false,
          reason: 'RESET REJECTED: Physical hazard sensors still detect active emergency condition!',
          timestamp: now,
        };
      }
      if (inputs.allHazardsCleared && inputs.isAcknowledged) {
        return {
          fromState: 'ALARM_STAGE_2',
          toState: 'RECOVERY',
          allowed: true,
          reason: 'Critical hazard cleared and operator acknowledged — entering controlled recovery sequence',
          timestamp: now,
        };
      }
      return {
        fromState: 'ALARM_STAGE_2',
        toState: 'ALARM_STAGE_2',
        allowed: true,
        reason: 'Emergency Stage 2 Klaxon & evacuation state sustained',
        timestamp: now,
      };

    case 'RECOVERY':
      // Prompt requirement: "New Hazard During Recovery"
      if (!inputs.allHazardsCleared) {
        return {
          fromState: 'RECOVERY',
          toState: 'ALARM_STAGE_2',
          allowed: true,
          reason: 'CRITICAL: Secondary hazard re-ignited during recovery sequence! Immediate re-escalation.',
          timestamp: now,
        };
      }
      if (inputs.recoveryTimerCompleted || inputs.resetRequested) {
        return {
          fromState: 'RECOVERY',
          toState: 'NORMAL',
          allowed: true,
          reason: 'Purge cycle completed and controller re-armed to NORMAL operations',
          timestamp: now,
        };
      }
      return {
        fromState: 'RECOVERY',
        toState: 'RECOVERY',
        allowed: true,
        reason: 'Ventilation purge and system diagnostics in progress',
        timestamp: now,
      };

    case 'FAULT':
      if (!inputs.sensorFaultActive && inputs.resetRequested) {
        return {
          fromState: 'FAULT',
          toState: 'NORMAL',
          allowed: true,
          reason: 'Sensor telemetry parity verified and fault line cleared',
          timestamp: now,
        };
      }
      return {
        fromState: 'FAULT',
        toState: 'FAULT',
        allowed: true,
        reason: 'Telemetry fault line persists',
        timestamp: now,
      };

    case 'OVERRIDE':
      if (!inputs.supervisorOverride) {
        return {
          fromState: 'OVERRIDE',
          toState: 'NORMAL',
          allowed: true,
          reason: 'Supervisor override disengaged — restored to automated controller logic',
          timestamp: now,
        };
      }
      return {
        fromState: 'OVERRIDE',
        toState: 'OVERRIDE',
        allowed: true,
        reason: 'Supervisor override active',
        timestamp: now,
      };

    default:
      return {
        fromState: currentState,
        toState: 'NORMAL',
        allowed: true,
        reason: 'Default state initialization',
        timestamp: now,
      };
  }
}

/**
 * Direct evaluation helper connecting Digital Electronics inputs (S, T, M)
 * to the FSM state machine with deterministic transitions.
 */
export function evaluateFsmFromDEInputs(
  currentState: FSMState,
  smoke: boolean,
  tempHigh: boolean,
  manualEmergency: boolean,
  isAcknowledged: boolean = false,
  recoveryTimerCompleted: boolean = false,
  resetRequested: boolean = false
): FSMTransitionResult {
  const intermediateOr = tempHigh || manualEmergency;
  const emergencyActive = (smoke && intermediateOr) || manualEmergency;
  const warningActive = (smoke || tempHigh) && !emergencyActive;
  const allHazardsCleared = !smoke && !tempHigh && !manualEmergency;

  return evaluateNextFSMState(currentState, {
    alarmStage2Active: emergencyActive,
    warningStage1Active: warningActive,
    manualPullActive: manualEmergency,
    sensorFaultActive: false,
    allHazardsCleared,
    isAcknowledged,
    recoveryTimerCompleted,
    supervisorOverride: false,
    resetRequested,
  });
}

