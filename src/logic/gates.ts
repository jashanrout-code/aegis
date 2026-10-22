/**
 * Digital Electronics Combinational Logic Core
 * Pure TypeScript functions with no UI/React dependencies.
 */

export const NOT = (a: boolean): boolean => !a;
export const AND = (a: boolean, b: boolean): boolean => a && b;
export const AND3 = (a: boolean, b: boolean, c: boolean): boolean => a && b && c;
export const OR = (a: boolean, b: boolean): boolean => a || b;
export const OR3 = (a: boolean, b: boolean, c: boolean): boolean => a || b || c;
export const NAND = (a: boolean, b: boolean): boolean => !(a && b);
export const NOR = (a: boolean, b: boolean): boolean => !(a || b);
export const XOR = (a: boolean, b: boolean): boolean => (a && !b) || (!a && b);
export const XNOR = (a: boolean, b: boolean): boolean => !XOR(a, b);

/**
 * Primary Control Function specified in project specification:
 * E = S AND (T OR M)   [also known as A = S AND (H OR M)]
 * 
 * Where:
 * S = Simulated Smoke input
 * T = Simulated High-Temperature condition (H)
 * M = Simulated Manual emergency pull input
 * E = Calculated Emergency output (A)
 */
export interface BooleanLogicEvaluation {
  emergencyOutput: boolean;
  alarmOutput: boolean;
  intermediateOr: boolean;
  distributiveCheck: boolean;
  booleanExpression: string;
  formulaText: string;
  inputs: {
    smoke: boolean;
    tempHigh: boolean;
    manualEmergency: boolean;
  };
}

export function evaluateEmergencyLogic(
  smoke: boolean,
  tempHigh: boolean,
  manualEmergency: boolean
): BooleanLogicEvaluation {
  const intermediateOr = OR(tempHigh, manualEmergency);
  const emergencyOutput = AND(smoke, intermediateOr);
  
  // Distributive law verification: S AND (T OR M) === (S AND T) OR (S AND M)
  const distributiveCheck = OR(AND(smoke, tempHigh), AND(smoke, manualEmergency));

  return {
    emergencyOutput,
    alarmOutput: emergencyOutput,
    intermediateOr,
    distributiveCheck,
    booleanExpression: `E = ${smoke ? '1' : '0'} ∧ (${tempHigh ? '1' : '0'} ∨ ${manualEmergency ? '1' : '0'}) = ${emergencyOutput ? '1' : '0'}`,
    formulaText: 'E = S ∧ (T ∨ M)',
    inputs: {
      smoke,
      tempHigh,
      manualEmergency,
    },
  };
}

export function evaluatePrimaryAlarmRule(smoke: boolean, highTemp: boolean, manualEmergency: boolean): {
  alarmOutput: boolean;
  emergencyOutput: boolean;
  intermediateOr: boolean;
  distributiveCheck: boolean;
  booleanExpression: string;
  formulaText: string;
  inputs: {
    smoke: boolean;
    tempHigh: boolean;
    manualEmergency: boolean;
  };
} {
  return evaluateEmergencyLogic(smoke, highTemp, manualEmergency);
}

/**
 * Truth table generator for the primary control function: E = S AND (T OR M)
 * Generates all 2^3 = 8 combinations with verified outputs.
 */
export interface TruthTableRow {
  rowNumber: number;
  smoke: boolean;
  highTemp: boolean;
  temp: boolean;
  manual: boolean;
  orResult: boolean;
  alarmOutput: boolean;
  emergencyOutput: boolean;
  minterm: string; // e.g. "m5: S·T'·M"
}

export function generatePrimaryTruthTable(): TruthTableRow[] {
  const rows: TruthTableRow[] = [];
  
  // 8 combinations: 000 through 111 (m0 to m7)
  for (let s = 0; s <= 1; s++) {
    for (let t = 0; t <= 1; t++) {
      for (let m = 0; m <= 1; m++) {
        const smoke = s === 1;
        const highTemp = t === 1;
        const manual = m === 1;
        const orResult = OR(highTemp, manual);
        const emergencyOutput = AND(smoke, orResult);
        const index = (s << 2) | (t << 1) | m;
        
        const minterm = `m${index}: ${smoke ? 'S' : "S'"}·${highTemp ? 'T' : "T'"}·${manual ? 'M' : "M'"}`;
        
        rows.push({
          rowNumber: index,
          smoke,
          highTemp,
          temp: highTemp,
          manual,
          orResult,
          alarmOutput: emergencyOutput,
          emergencyOutput,
          minterm,
        });
      }
    }
  }
  
  return rows;
}

/**
 * Stage 1 Warning Logic (Pre-Alarm):
 * W = EN AND (S XOR H XOR P)
 * Triggered when any single hazard is active without full critical confluence.
 */
export function evaluateStage1WarningRule(
  enable: boolean,
  smoke: boolean,
  highTemp: boolean,
  pressure: boolean,
  manualEmergency: boolean
): boolean {
  if (!enable) return false;
  // If manual pull is active or primary alarm rule is satisfied, it escalates to Stage 2
  if (manualEmergency) return false;
  
  // At least one condition active, but not the full critical confluence
  const hasAnyHazard = smoke || highTemp || pressure;
  const hasConfluence = evaluatePrimaryAlarmRule(smoke, highTemp, manualEmergency).alarmOutput;
  
  return hasAnyHazard && !hasConfluence;
}

/**
 * Ventilation Overdrive Logic:
 * V_purge = EN AND (S OR H) AND NOT(System_Fault)
 */
export function evaluateVentilationRule(enable: boolean, smoke: boolean, highTemp: boolean, fault: boolean): boolean {
  return AND(AND(enable, OR(smoke, highTemp)), NOT(fault));
}
