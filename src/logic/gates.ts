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
 * Universal Gate Equivalence Models:
 * 1. NAND-only implementation of an OR gate:
 *    By De Morgan's Law: A OR B = NOT(NOT(A) AND NOT(B))
 *    - NOT(A) is constructed via NAND(A, A)
 *    - NOT(B) is constructed via NAND(B, B)
 *    - Final OR output = NAND(NOT(A), NOT(B))
 *
 * 2. NOR-only implementation of an AND gate:
 *    By De Morgan's Law: A AND B = NOT(NOT(A) OR NOT(B))
 *    - NOT(A) is constructed via NOR(A, A)
 *    - NOT(B) is constructed via NOR(B, B)
 *    - Final AND output = NOR(NOT(A), NOT(B))
 */

export interface UniversalGateEvaluation {
  circuitType: 'NAND_GATE' | 'NOR_GATE' | 'NAND_ONLY_OR' | 'NOR_ONLY_AND';
  inputs: { a: boolean; b: boolean };
  intermediateSignals: {
    notA?: boolean;
    notB?: boolean;
    stage1A?: boolean;
    stage1B?: boolean;
  };
  output: boolean;
  standardEquivalentOutput: boolean;
  isEquivalent: boolean;
  formula: string;
  deMorganProof: string;
  explanation: string;
}

export function evaluateNandGate(a: boolean, b: boolean): UniversalGateEvaluation {
  const output = NAND(a, b);
  return {
    circuitType: 'NAND_GATE',
    inputs: { a, b },
    intermediateSignals: {},
    output,
    standardEquivalentOutput: output,
    isEquivalent: true,
    formula: 'Y = NOT(A AND B) = (A · B)\'',
    deMorganProof: 'Standard universal NAND gate. Output is LOW (0) only when both inputs are HIGH (1).',
    explanation: output 
      ? 'Output is HIGH (1) because at least one input is LOW (0).'
      : 'Output is LOW (0) because both inputs A and B are HIGH (1).',
  };
}

export function evaluateNorGate(a: boolean, b: boolean): UniversalGateEvaluation {
  const output = NOR(a, b);
  return {
    circuitType: 'NOR_GATE',
    inputs: { a, b },
    intermediateSignals: {},
    output,
    standardEquivalentOutput: output,
    isEquivalent: true,
    formula: 'Y = NOT(A OR B) = (A + B)\'',
    deMorganProof: 'Standard universal NOR gate. Output is HIGH (1) only when both inputs are LOW (0).',
    explanation: output
      ? 'Output is HIGH (1) because both inputs A and B are LOW (0).'
      : 'Output is LOW (0) because at least one input is HIGH (1).',
  };
}

export function evaluateNandOnlyOr(a: boolean, b: boolean): UniversalGateEvaluation {
  // Gate 1: NOT(A) implemented as NAND(A, A)
  const notA = NAND(a, a);
  // Gate 2: NOT(B) implemented as NAND(B, B)
  const notB = NAND(b, b);
  // Gate 3: Final NAND combining notA and notB
  const output = NAND(notA, notB);
  const standardOr = OR(a, b);

  return {
    circuitType: 'NAND_ONLY_OR',
    inputs: { a, b },
    intermediateSignals: {
      notA,
      notB,
      stage1A: notA,
      stage1B: notB,
    },
    output,
    standardEquivalentOutput: standardOr,
    isEquivalent: output === standardOr,
    formula: 'Y = NAND(NAND(A, A), NAND(B, B)) = (A\' · B\')\' = A + B',
    deMorganProof: 'De Morgan: (A\' · B\')\' = (A\')\' + (B\')\' = A + B. Verified equivalent to OR gate.',
    explanation: `Inputs A=${a ? 1 : 0}, B=${b ? 1 : 0} produce inverted intermediate signals NOT(A)=${notA ? 1 : 0} and NOT(B)=${notB ? 1 : 0}. Final NAND produces Y=${output ? 1 : 0}, matching standard OR(A,B)=${standardOr ? 1 : 0}.`,
  };
}

export function evaluateNorOnlyAnd(a: boolean, b: boolean): UniversalGateEvaluation {
  // Gate 1: NOT(A) implemented as NOR(A, A)
  const notA = NOR(a, a);
  // Gate 2: NOT(B) implemented as NOR(B, B)
  const notB = NOR(b, b);
  // Gate 3: Final NOR combining notA and notB
  const output = NOR(notA, notB);
  const standardAnd = AND(a, b);

  return {
    circuitType: 'NOR_ONLY_AND',
    inputs: { a, b },
    intermediateSignals: {
      notA,
      notB,
      stage1A: notA,
      stage1B: notB,
    },
    output,
    standardEquivalentOutput: standardAnd,
    isEquivalent: output === standardAnd,
    formula: 'Y = NOR(NOR(A, A), NOR(B, B)) = (A\' + B\')\' = A · B',
    deMorganProof: 'De Morgan: (A\' + B\')\' = (A\')\' · (B\')\' = A · B. Verified equivalent to AND gate.',
    explanation: `Inputs A=${a ? 1 : 0}, B=${b ? 1 : 0} produce inverted intermediate signals NOT(A)=${notA ? 1 : 0} and NOT(B)=${notB ? 1 : 0}. Final NOR produces Y=${output ? 1 : 0}, matching standard AND(A,B)=${standardAnd ? 1 : 0}.`,
  };
}

export interface UniversalTruthTableRow {
  rowNumber: number;
  a: boolean;
  b: boolean;
  notA?: boolean;
  notB?: boolean;
  output: boolean;
  standardOutput: boolean;
  isMatch: boolean;
}

export function generateUniversalTruthTable(
  type: 'NAND_GATE' | 'NOR_GATE' | 'NAND_ONLY_OR' | 'NOR_ONLY_AND'
): UniversalTruthTableRow[] {
  const rows: UniversalTruthTableRow[] = [];
  for (let aVal = 0; aVal <= 1; aVal++) {
    for (let bVal = 0; bVal <= 1; bVal++) {
      const a = aVal === 1;
      const b = bVal === 1;
      const index = (aVal << 1) | bVal;

      let result: UniversalGateEvaluation;
      switch (type) {
        case 'NAND_GATE':
          result = evaluateNandGate(a, b);
          break;
        case 'NOR_GATE':
          result = evaluateNorGate(a, b);
          break;
        case 'NAND_ONLY_OR':
          result = evaluateNandOnlyOr(a, b);
          break;
        case 'NOR_ONLY_AND':
          result = evaluateNorOnlyAnd(a, b);
          break;
      }

      rows.push({
        rowNumber: index,
        a,
        b,
        notA: result.intermediateSignals.notA,
        notB: result.intermediateSignals.notB,
        output: result.output,
        standardOutput: result.standardEquivalentOutput,
        isMatch: result.isEquivalent,
      });
    }
  }
  return rows;
}

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
