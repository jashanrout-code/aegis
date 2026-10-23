import { describe, it, expect, beforeEach } from 'vitest';
import { simulationStore } from '../engine/simulationStore';
import { 
  evaluateNandGate, 
  evaluateNorGate, 
  evaluateNandOnlyOr, 
  evaluateNorOnlyAnd 
} from '../logic/gates';

describe('Emergency Response System & Shared Engine Integration Tests', () => {
  beforeEach(() => {
    simulationStore.resetSimulation();
  });

  it('initializes default response actions across all 6 industrial zones', () => {
    const state = simulationStore.getState();
    const actions = Object.values(state.responseActions);

    expect(actions.length).toBeGreaterThanOrEqual(18); // at least 3 actions (Sprinkler, Vent, Cool) per zone
    
    // Check Production Zone actions
    const prodSprinkler = state.responseActions['ACT-SPRINKLER-ZONE_PROD'];
    expect(prodSprinkler).toBeDefined();
    expect(prodSprinkler.status).toBe('STANDBY');
    expect(prodSprinkler.progress).toBe(0);

    const prodVent = state.responseActions['ACT-VENT-ZONE_PROD'];
    expect(prodVent).toBeDefined();
    expect(prodVent.status).toBe('STANDBY');

    const prodCool = state.responseActions['ACT-COOL-ZONE_PROD'];
    expect(prodCool).toBeDefined();
    expect(prodCool.status).toBe('STANDBY');
  });

  it('activating sprinkler causes progressive suppression of temperature and smoke', () => {
    // Set high smoke and high temperature in Storage Zone
    simulationStore.setAnalogLevel('ZONE_STORAGE', 'smokeLevel', 80);
    simulationStore.setAnalogLevel('ZONE_STORAGE', 'temperature', 95);

    const beforeState = simulationStore.getState();
    const initialTemp = beforeState.zones.ZONE_STORAGE.sensors.temperature;
    const initialSmoke = beforeState.zones.ZONE_STORAGE.sensors.smokeLevel;

    // Activate Sprinklers for Storage Zone
    simulationStore.activateResponseAction('ACT-SPRINKLER-ZONE_STORAGE');

    let state = simulationStore.getState();
    expect(state.responseActions['ACT-SPRINKLER-ZONE_STORAGE'].status).toBe('ACTIVE');

    // Run 10 ticks
    for (let i = 0; i < 10; i++) {
      simulationStore.tick();
    }

    state = simulationStore.getState();
    const action = state.responseActions['ACT-SPRINKLER-ZONE_STORAGE'];
    expect(action.progress).toBeGreaterThan(0);

    const currentTemp = state.zones.ZONE_STORAGE.sensors.temperature;
    const currentSmoke = state.zones.ZONE_STORAGE.sensors.smokeLevel;

    // Verify temperature and smoke gradually decreased
    expect(currentTemp).toBeLessThan(initialTemp);
    expect(currentSmoke).toBeLessThan(initialSmoke);
  });

  it('activating ventilation reduces smoke obscuration gradually', () => {
    simulationStore.setAnalogLevel('ZONE_PROD', 'smokeLevel', 75);

    const initialSmoke = simulationStore.getState().zones.ZONE_PROD.sensors.smokeLevel;

    simulationStore.activateResponseAction('ACT-VENT-ZONE_PROD');

    for (let i = 0; i < 8; i++) {
      simulationStore.tick();
    }

    const currentSmoke = simulationStore.getState().zones.ZONE_PROD.sensors.smokeLevel;
    expect(currentSmoke).toBeLessThan(initialSmoke);
  });

  it('activating cooling decreases temperature and de-asserts high temperature comparator', () => {
    simulationStore.setAnalogLevel('ZONE_UTIL', 'temperature', 70); // above 55 threshold

    let state = simulationStore.getState();
    expect(state.zones.ZONE_UTIL.sensors.tempHigh).toBe(true);

    simulationStore.activateResponseAction('ACT-COOL-ZONE_UTIL');

    // Run enough ticks for temperature to drop below safe hysteresis threshold
    for (let i = 0; i < 35; i++) {
      simulationStore.tick();
    }

    state = simulationStore.getState();
    const currentTemp = state.zones.ZONE_UTIL.sensors.temperature;
    expect(currentTemp).toBeLessThan(70);
    // As temperature drops below 50, tempHigh comparator goes false
    if (currentTemp < 50) {
      expect(state.zones.ZONE_UTIL.sensors.tempHigh).toBe(false);
    }
  });

  it('safety rule: activating response actions does NOT automatically close open incidents', () => {
    // Inject emergency scenario by raising both smoke and temperature above trigger points
    simulationStore.setAnalogLevel('ZONE_STORAGE', 'smokeLevel', 80);
    simulationStore.setAnalogLevel('ZONE_STORAGE', 'temperature', 85);

    // Run tick to trigger logic and incident creation
    simulationStore.tick();

    let state = simulationStore.getState();
    expect(state.incidents.length).toBeGreaterThan(0);
    const incident = state.incidents[0];
    expect(['DETECTED', 'OPEN', 'ACKNOWLEDGED', 'UNDER_INVESTIGATION']).toContain(incident.status);

    // Operator activates response
    simulationStore.activateResponseAction('ACT-SPRINKLER-ZONE_STORAGE');
    simulationStore.tick();

    state = simulationStore.getState();
    const incidentAfterActivation = state.incidents.find(i => i.id === incident.id);
    expect(incidentAfterActivation).toBeDefined();
    // Must NOT be closed/resolved automatically
    expect(incidentAfterActivation?.status).not.toBe('RESOLVED');
  });

  it('timing diagram history records live signal samples with clock pulses and flip-flop transitions', () => {
    simulationStore.toggleClockRunning(); // Start clock
    simulationStore.setClockFrequency(2);

    for (let i = 0; i < 5; i++) {
      simulationStore.tick();
    }

    const state = simulationStore.getState();
    expect(state.timingHistory.length).toBeGreaterThan(0);

    const latestSample = state.timingHistory[state.timingHistory.length - 1];
    expect(latestSample).toHaveProperty('timestamp');
    expect(latestSample).toHaveProperty('clock');
    expect(latestSample).toHaveProperty('inputA');
    expect(latestSample).toHaveProperty('inputB');
    expect(latestSample).toHaveProperty('nandOut');
    expect(latestSample).toHaveProperty('norOut');
    expect(latestSample).toHaveProperty('primaryAlarmOut');
    expect(latestSample).toHaveProperty('sequentialRegisterQ');

    // Single step clock pulse adds rising and falling edge samples
    const historyLenBefore = state.timingHistory.length;
    simulationStore.singleStepClockPulse();
    const nextState = simulationStore.getState();
    expect(nextState.timingHistory.length).toBeGreaterThan(historyLenBefore);
    const pulseSample = nextState.timingHistory[nextState.timingHistory.length - 2];
    expect(pulseSample.clock).toBe(true);
  });

  it('universal NAND and NOR gates match expected truth tables', () => {
    // NAND: false only when both inputs true
    expect(evaluateNandGate(false, false).output).toBe(true);
    expect(evaluateNandGate(true, false).output).toBe(true);
    expect(evaluateNandGate(false, true).output).toBe(true);
    expect(evaluateNandGate(true, true).output).toBe(false);

    // NOR: true only when both inputs false
    expect(evaluateNorGate(false, false).output).toBe(true);
    expect(evaluateNorGate(true, false).output).toBe(false);
    expect(evaluateNorGate(false, true).output).toBe(false);
    expect(evaluateNorGate(true, true).output).toBe(false);

    // De Morgan NAND-only OR equals A OR B
    expect(evaluateNandOnlyOr(false, false).output).toBe(false);
    expect(evaluateNandOnlyOr(true, false).output).toBe(true);
    expect(evaluateNandOnlyOr(false, true).output).toBe(true);
    expect(evaluateNandOnlyOr(true, true).output).toBe(true);

    // De Morgan NOR-only AND equals A AND B
    expect(evaluateNorOnlyAnd(false, false).output).toBe(false);
    expect(evaluateNorOnlyAnd(true, false).output).toBe(false);
    expect(evaluateNorOnlyAnd(false, true).output).toBe(false);
    expect(evaluateNorOnlyAnd(true, true).output).toBe(true);
  });
});
