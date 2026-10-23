import { describe, it, expect } from 'vitest';
import { 
  evaluatePrimaryAlarmRule, 
  generatePrimaryTruthTable, 
  AND, 
  OR, 
  NOT, 
  XOR, 
  NAND, 
  NOR,
  evaluateNandGate,
  evaluateNorGate,
  evaluateNandOnlyOr,
  evaluateNorOnlyAnd,
  generateUniversalTruthTable
} from '../logic/gates';
import { 
  evaluateComparatorWithHysteresis, 
  evaluateWindowComparator, 
  DEFAULT_THRESHOLDS 
} from '../logic/comparators';
import { 
  multiplexer8to1, 
  demultiplexer1to8 
} from '../logic/multiplexer';
import { 
  priorityEncoder8to3, 
  bcdTo7Segment 
} from '../logic/encoder';
import { 
  packageZoneTelemetry, 
  verifyTelemetryPacket 
} from '../logic/parity';
import { 
  evaluateNextFSMState, 
  FSMInputConditions 
} from '../logic/fsm';
import { 
  calculateEvacuationRoute 
} from '../logic/routing';

describe('1. Digital Electronics Core Gates & Boolean Logic', () => {
  it('implements fundamental logic gates correctly', () => {
    expect(AND(true, true)).toBe(true);
    expect(AND(true, false)).toBe(false);
    expect(OR(false, false)).toBe(false);
    expect(OR(false, true)).toBe(true);
    expect(NOT(true)).toBe(false);
    expect(XOR(true, false)).toBe(true);
    expect(XOR(true, true)).toBe(false);
    expect(NAND(true, true)).toBe(false);
    expect(NOR(false, false)).toBe(true);
  });

  it('exhaustively evaluates all 8 combinations of primary rule A = S AND (H OR M)', () => {
    const truthTable = generatePrimaryTruthTable();
    expect(truthTable).toHaveLength(8);

    // Verify each combination matches exact digital electronics Boolean specification
    truthTable.forEach(row => {
      const calculated = evaluatePrimaryAlarmRule(row.smoke, row.highTemp, row.manual);
      expect(calculated.alarmOutput).toBe(row.alarmOutput);
      // Verify distributive law equivalence: S(H + M) === SH + SM
      expect(calculated.distributiveCheck).toBe(calculated.alarmOutput);

      // Specifically check truth conditions:
      // A is 1 ONLY when S is 1 AND at least one of (H, M) is 1
      if (!row.smoke) {
        expect(row.alarmOutput).toBe(false);
      } else if (!row.highTemp && !row.manual) {
        expect(row.alarmOutput).toBe(false);
      } else {
        expect(row.alarmOutput).toBe(true);
      }
    });

    // Check row counts: 3 rows should be 1 (m5: 101, m6: 110, m7: 111), 5 rows should be 0
    const activeRows = truthTable.filter(r => r.alarmOutput);
    expect(activeRows).toHaveLength(3);
  });

  it('evaluates individual NAND and NOR gates and generates exact 4-row truth tables', () => {
    const nandTable = generateUniversalTruthTable('NAND_GATE');
    expect(nandTable).toHaveLength(4);
    // NAND: [0,0]->1, [0,1]->1, [1,0]->1, [1,1]->0
    expect(nandTable.map(r => r.output)).toEqual([true, true, true, false]);

    const norTable = generateUniversalTruthTable('NOR_GATE');
    expect(norTable).toHaveLength(4);
    // NOR: [0,0]->1, [0,1]->0, [1,0]->0, [1,1]->0
    expect(norTable.map(r => r.output)).toEqual([true, false, false, false]);
  });

  it('demonstrates NAND-only OR gate equivalence via De Morgan Law: Y = NAND(NAND(A,A), NAND(B,B)) === A OR B', () => {
    const table = generateUniversalTruthTable('NAND_ONLY_OR');
    expect(table).toHaveLength(4);

    table.forEach(row => {
      const standardOr = OR(row.a, row.b);
      const evalResult = evaluateNandOnlyOr(row.a, row.b);

      // Verify intermediate tied-input NOT gates: NOT(A) = NAND(A,A)
      expect(evalResult.intermediateSignals.notA).toBe(!row.a);
      expect(evalResult.intermediateSignals.notB).toBe(!row.b);

      // Verify identical output to standard OR gate
      expect(evalResult.output).toBe(standardOr);
      expect(evalResult.isEquivalent).toBe(true);
      expect(row.isMatch).toBe(true);
    });

    // Outputs for OR gate: [0,0]->0, [0,1]->1, [1,0]->1, [1,1]->1
    expect(table.map(r => r.output)).toEqual([false, true, true, true]);
  });

  it('demonstrates NOR-only AND gate equivalence via De Morgan Law: Y = NOR(NOR(A,A), NOR(B,B)) === A AND B', () => {
    const table = generateUniversalTruthTable('NOR_ONLY_AND');
    expect(table).toHaveLength(4);

    table.forEach(row => {
      const standardAnd = AND(row.a, row.b);
      const evalResult = evaluateNorOnlyAnd(row.a, row.b);

      // Verify intermediate tied-input NOT gates: NOT(A) = NOR(A,A)
      expect(evalResult.intermediateSignals.notA).toBe(!row.a);
      expect(evalResult.intermediateSignals.notB).toBe(!row.b);

      // Verify identical output to standard AND gate
      expect(evalResult.output).toBe(standardAnd);
      expect(evalResult.isEquivalent).toBe(true);
      expect(row.isMatch).toBe(true);
    });

    // Outputs for AND gate: [0,0]->0, [0,1]->0, [1,0]->0, [1,1]->1
    expect(table.map(r => r.output)).toEqual([false, false, false, true]);
  });
});

describe('2. Digital Comparators with Schmitt Trigger Hysteresis', () => {
  it('switches state based on threshold and prevents jitter via hysteresis', () => {
    const { tempHighCelsius, tempHysteresis } = DEFAULT_THRESHOLDS; // 60, 6

    // From LOW state, 59°C should remain LOW
    expect(evaluateComparatorWithHysteresis(59, tempHighCelsius, tempHysteresis, false)).toBe(false);
    // 60°C trips to HIGH
    expect(evaluateComparatorWithHysteresis(60, tempHighCelsius, tempHysteresis, false)).toBe(true);
    // From HIGH state, 56°C should REMAIN HIGH due to hysteresis (60 - 6 = 54°C trip clear point)
    expect(evaluateComparatorWithHysteresis(56, tempHighCelsius, tempHysteresis, true)).toBe(true);
    // Below 54°C drops back to LOW
    expect(evaluateComparatorWithHysteresis(53, tempHighCelsius, tempHysteresis, true)).toBe(false);
  });

  it('window comparator detects pressure outside safe range', () => {
    // Safe band [45, 115] PSI
    expect(evaluateWindowComparator(80, 45, 115, false)).toBe(false); // safe
    expect(evaluateWindowComparator(125, 45, 115, false)).toBe(true); // high anomaly
    expect(evaluateWindowComparator(30, 45, 115, false)).toBe(true); // low vacuum anomaly
  });
});

describe('3. Multiplexer, Priority Encoder & Telemetry Parity', () => {
  it('8-to-1 MUX selects correct channel data based on S2, S1, S0', () => {
    const inputs = {
      d0: false, d1: false, d2: false, d3: true,
      d4: false, d5: false, d6: false, d7: false,
    };

    // Address 3 (S2=0, S1=1, S0=1)
    const resultCh3 = multiplexer8to1(inputs, false, true, true);
    expect(resultCh3.outputY).toBe(true);
    expect(resultCh3.outputW).toBe(false);
    expect(resultCh3.selectedChannel).toBe(3);

    // Address 2 (S2=0, S1=1, S0=0)
    const resultCh2 = multiplexer8to1(inputs, false, true, false);
    expect(resultCh2.outputY).toBe(false);
  });

  it('8-to-3 Priority Encoder reports highest index active input', () => {
    // Inputs: channels 1, 3, and 5 active simultaneously
    const lines = [false, true, false, true, false, true, false, false];
    const encoded = priorityEncoder8to3(lines);

    expect(encoded.hasActiveInput).toBe(true);
    expect(encoded.encodedCode).toBe(5); // Highest active channel is 5
    expect(encoded.a2).toBe(true); // 5 = 101 in binary
    expect(encoded.a1).toBe(false);
    expect(encoded.a0).toBe(true);
  });

  it('detects corrupted telemetry parity bits', () => {
    // Normal packet with valid even parity
    const validPacket = packageZoneTelemetry(2, true, true, false, false, true, false);
    const validCheck = verifyTelemetryPacket(validPacket);
    expect(validCheck.valid).toBe(true);

    // Injected parity error simulates line noise
    const corruptedPacket = packageZoneTelemetry(2, true, true, false, false, true, true);
    const corruptedCheck = verifyTelemetryPacket(corruptedPacket);
    expect(corruptedCheck.valid).toBe(false);
  });
});

describe('4. FSM Controller & Emergency Transitions', () => {
  const baseInputs: FSMInputConditions = {
    alarmStage2Active: false,
    warningStage1Active: false,
    manualPullActive: false,
    sensorFaultActive: false,
    allHazardsCleared: true,
    isAcknowledged: false,
    recoveryTimerCompleted: false,
    supervisorOverride: false,
    resetRequested: false,
  };

  it('transitions from NORMAL to WARNING on pre-alarm', () => {
    const res = evaluateNextFSMState('NORMAL', {
      ...baseInputs,
      warningStage1Active: true,
      allHazardsCleared: false,
    });
    expect(res.toState).toBe('WARNING');
  });

  it('escalates to ALARM_STAGE_2 on dual hazard or manual pull', () => {
    const res = evaluateNextFSMState('WARNING', {
      ...baseInputs,
      alarmStage2Active: true,
      allHazardsCleared: false,
    });
    expect(res.toState).toBe('ALARM_STAGE_2');
  });

  it('REJECTS reset if physical hazard is still active during ALARM_STAGE_2', () => {
    const res = evaluateNextFSMState('ALARM_STAGE_2', {
      ...baseInputs,
      alarmStage2Active: false,
      allHazardsCleared: false, // Fire/smoke still detected!
      resetRequested: true,
    });
    expect(res.allowed).toBe(false);
    expect(res.toState).toBe('ALARM_STAGE_2');
    expect(res.reason).toContain('RESET REJECTED');
  });

  it('enters RECOVERY only when hazard cleared and operator acknowledged', () => {
    const res = evaluateNextFSMState('ALARM_STAGE_2', {
      ...baseInputs,
      allHazardsCleared: true,
      isAcknowledged: true,
    });
    expect(res.toState).toBe('RECOVERY');
  });

  it('re-escalates to ALARM_STAGE_2 if new hazard erupts during RECOVERY', () => {
    const res = evaluateNextFSMState('RECOVERY', {
      ...baseInputs,
      allHazardsCleared: false, // New hazard!
      alarmStage2Active: true,
    });
    expect(res.toState).toBe('ALARM_STAGE_2');
    expect(res.reason).toContain('re-ignited during recovery');
  });
});

describe('5. Facility Evacuation Route Calculation', () => {
  it('finds safe route from Production Hall to nearest exit under normal conditions', () => {
    const route = calculateEvacuationRoute('ZONE_PROD', []);
    expect(route.routeFound).toBe(true);
    expect(route.waypoints.length).toBeGreaterThan(1);
    expect(route.blockedCorridors).toHaveLength(0);
  });

  it('dynamically reroutes around blocked hazard zone', () => {
    // If Central Storage and East passage is blocked by emergency in Storage
    const route = calculateEvacuationRoute('ZONE_PROD', ['ZONE_STORAGE', 'ZONE_CTRL']);
    expect(route.routeFound).toBe(true);
    // Should route via North exit or clear walkway
    expect(route.waypoints.length).toBeGreaterThan(0);
  });
});

describe('6. Digital Electronics E = S AND (T OR M) Function & Truth Table Verification', () => {
  it('evaluates all 8 combinations of E = S AND (T OR M) strictly according to Boolean algebra', () => {
    const expectedTable = [
      { s: false, t: false, m: false, or: false, e: false }, // m0: 000
      { s: false, t: false, m: true,  or: true,  e: false }, // m1: 001
      { s: false, t: true,  m: false, or: true,  e: false }, // m2: 010
      { s: false, t: true,  m: true,  or: true,  e: false }, // m3: 011
      { s: true,  t: false, m: false, or: false, e: false }, // m4: 100
      { s: true,  t: false, m: true,  or: true,  e: true  }, // m5: 101
      { s: true,  t: true,  m: false, or: true,  e: true  }, // m6: 110
      { s: true,  t: true,  m: true,  or: true,  e: true  }, // m7: 111
    ];

    expectedTable.forEach(testCase => {
      const res = evaluatePrimaryAlarmRule(testCase.s, testCase.t, testCase.m);
      expect(res.intermediateOr).toBe(testCase.or);
      expect(res.emergencyOutput).toBe(testCase.e);
      expect(res.alarmOutput).toBe(testCase.e);
      expect(res.distributiveCheck).toBe(testCase.e);
    });
  });

  it('generates a truth table with all 8 rows matching the implemented function and minterms', () => {
    const table = generatePrimaryTruthTable();
    expect(table).toHaveLength(8);

    table.forEach(row => {
      const manualEval = row.smoke && (row.temp || row.manual);
      expect(row.emergencyOutput).toBe(manualEval);
      expect(row.alarmOutput).toBe(manualEval);
      expect(row.orResult).toBe(row.temp || row.manual);
      expect(row.rowNumber).toBeGreaterThanOrEqual(0);
      expect(row.rowNumber).toBeLessThanOrEqual(7);
      expect(row.minterm).toContain(`m${row.rowNumber}`);
    });
  });
});

describe('7. Incident Lifecycle Non-Duplication and FSM Transition Recording', () => {
  it('prevents duplicate incident creation upon repeated tick evaluations of the same active condition', async () => {
    const { simulationStore } = await import('../engine/simulationStore');
    simulationStore.resetSimulation();
    expect(simulationStore.getState().incidents).toHaveLength(0);

    // Trigger hazard
    simulationStore.setAnalogLevel('ZONE_STORAGE', 'smokeLevel', 55.0);
    simulationStore.setAnalogLevel('ZONE_STORAGE', 'temperature', 85.0);
    expect(simulationStore.getState().incidents).toHaveLength(1);

    // Step simulation multiple ticks with condition still active
    for (let i = 0; i < 5; i++) {
      simulationStore.tick();
    }

    // Must still have only 1 incident record, not 6 duplicate records!
    expect(simulationStore.getState().incidents).toHaveLength(1);
  });

  it('tracks previousFSMState, lastFSMTransition and transition history on state changes', async () => {
    const { simulationStore } = await import('../engine/simulationStore');
    simulationStore.resetSimulation();

    // From NORMAL, trigger pre-alarm warning
    simulationStore.setAnalogLevel('ZONE_STORAGE', 'smokeLevel', 40.0);
    const stateWarn = simulationStore.getState();
    expect(stateWarn.fsmState).toBe('WARNING');
    expect(stateWarn.previousFSMState).toBe('NORMAL');
    expect(stateWarn.lastFSMTransition).toBeDefined();
    expect(stateWarn.lastFSMTransition?.fromState).toBe('NORMAL');
    expect(stateWarn.lastFSMTransition?.toState).toBe('WARNING');
    expect(stateWarn.fsmTransitionHistory.length).toBeGreaterThanOrEqual(1);

    // Escalate to ALARM_STAGE_2
    simulationStore.triggerEmergencyPull('ZONE_STORAGE');
    const stateEmergency = simulationStore.getState();
    expect(stateEmergency.fsmState).toBe('ALARM_STAGE_2');
    expect(stateEmergency.previousFSMState).toBe('WARNING');
    expect(stateEmergency.lastFSMTransition?.toState).toBe('ALARM_STAGE_2');
  });

  it('escalates an existing warning incident to critical without creating a second incident record', async () => {
    const { simulationStore } = await import('../engine/simulationStore');
    simulationStore.resetSimulation();

    // 1. Initial single sensor trip -> Stage 1 Warning
    simulationStore.setAnalogLevel('ZONE_STORAGE', 'smokeLevel', 40.0);
    const incidents1 = simulationStore.getState().incidents;
    expect(incidents1).toHaveLength(1);
    expect(incidents1[0].severity).toBe('MEDIUM');

    // 2. Secondary sensor trip -> Critical Confluence
    simulationStore.setAnalogLevel('ZONE_STORAGE', 'temperature', 85.0);
    const incidents2 = simulationStore.getState().incidents;
    expect(incidents2).toHaveLength(1); // No duplicate!
    expect(incidents2[0].severity).toBe('CRITICAL');
  });
});
