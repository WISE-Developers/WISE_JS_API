export type FuelTypes = "C-1"|"C-2"|"C-3"|"C-4"|"C-5"|"C-6"|"C-7"|
  "D-1"|"D-2"|"D-1/D-2"|
  "M-1"|"M-2"|"M-1/M-2"|"M-3"|"M-4"|"M-3/M-4"|
  "O-1a"|"O-1b"|"O-1AB"|
  "S-1"|"S-2"|"S-3"|
  "Non"|"Non-Fuel"|
  "NZ-2"|
  "NZ-15"|
  "NZ-30"|"NZ-31"|"NZ-32"|"NZ-33"|
  "NZ-40"|"NZ-41"|"NZ-43"|"NZ-44"|"NZ-45"|"NZ-46"|"NZ-47"|
  "NZ-50"|"NZ-51"|"NZ-52"|"NZ-53"|"NZ-54"|"NZ-55"|"NZ-56"|"NZ-57"|"NZ-58"|
  "NZ-60"|"NZ-61"|"NZ-62"|"NZ-63"|"NZ-64"|"NZ-65"|"NZ-66"|"NZ-67"|"NZ-68"|"NZ-69"|
  "NZ-70"|"NZ-71";

export interface SpreadAttribute {
  stream(): string;
}

export interface FmcAttribute {
  stream(): string;
}

export interface SfcAttribute {
  stream(): string;
}

export interface RsiAttribute {
  stream(): string;
}

export interface IsfAttribute {
  stream(): string;
}

export interface AccAlphaAttribute {
  stream(): string;
}

export interface LbAttribute {
  stream(): string;
}

export interface CfbAttribute {
  stream(): string;
}

export interface FlameLengthAttribute {
  stream(): string;
}

/**
 * Spread parameters for the S-1, S-2, S-3, and NZ-64 fuel types.
 */
export class S1Spread implements SpreadAttribute {
  public a: number;
  public b: number;
  public c: number;
  public q: number;
  public bui0: number;
  public maxBe: number;
  
  public constructor(init?: Partial<S1Spread>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `S1|${this.a}|${this.b}|${this.c}|${this.q}|${this.bui0}|${this.maxBe}`;
  }
}

/**
 * Spread parameters for the C-1, C-2, C-3, C-4, C-5, C-7, and NZ-70 fuel types.
 */
export class C1Spread implements SpreadAttribute {
  public a: number;
  public b: number;
  public c: number;
  public q: number;
  public bui0: number;
  public maxBe: number;
  public height: number;
  public cbh: number;
  public cfl: number;
  
  public constructor(init?: Partial<C1Spread>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `C1|${this.a}|${this.b}|${this.c}|${this.q}|${this.bui0}|${this.maxBe}|${this.height}|${this.cbh}|${this.cfl}`;
  }
}

/**
 * Spread parameter for the C-6, NZ-60, NZ-61, NZ-66, NZ-67, and NZ-71 fuel types.
 */
export class C6Spread implements SpreadAttribute {
  public a: number;
  public b: number;
  public c: number;
  public q: number;
  public bui0: number;
  public maxBe: number;
  public height: number;
  public cbh: number;
  public cfl: number;
  
  public constructor(init?: Partial<C6Spread>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `C6|${this.a}|${this.b}|${this.c}|${this.q}|${this.bui0}|${this.maxBe}|${this.height}|${this.cbh}|${this.cfl}`;
  }
}

/**
 * Spread parameter for the D-1, D-2, D-1/D-2, and NZ-68 fuel types.
 */
export class D1Spread implements SpreadAttribute {
  public a: number;
  public b: number;
  public c: number;
  public q: number;
  public bui0: number;
  public maxBe: number;
  public height: number;
  public cbh: number;
  public cfl: number;
  
  public constructor(init?: Partial<D1Spread>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `D1|${this.a}|${this.b}|${this.c}|${this.q}|${this.bui0}|${this.maxBe}|${this.height}|${this.cbh}|${this.cfl}`;
  }
}

/**
 * Spread parameter for the NZ-45, NZ-47, NZ-51, NZ-52, NZ-55, NZ-56, NZ-57, and NZ-58 fuel types.
 */
export class NzSpread implements SpreadAttribute {
  public a: number;
  public b: number;
  public c: number;
  public q: number;
  public bui0: number;
  public maxBe: number;
  public height: number;
  public cbh: number;
  public cfl: number;
  
  public constructor(init?: Partial<NzSpread>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `Nz|${this.a}|${this.b}|${this.c}|${this.q}|${this.bui0}|${this.maxBe}|${this.height}|${this.cbh}|${this.cfl}`;
  }
}

/**
 * Spread parameter for the O-1a, O-1b, NZ-2, NZ-15, NZ-30, NZ-31, NZ-32, NZ-33, NZ-40, NZ-41, NZ-43, NZ-44, NZ-46,
 * NZ-50, NZ-53, NZ-62, NZ-63, and NZ-65 fuel types.
 */
export class O1Spread implements SpreadAttribute {
  public a: number;
  public b: number;
  public c: number;
  public q: number;
  public bui0: number;
  public maxBe: number;
  public curingDegree: number;
  
  public constructor(init?: Partial<O1Spread>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `O1|${this.a}|${this.b}|${this.c}|${this.q}|${this.bui0}|${this.maxBe}|${this.curingDegree}`;
  }
}

/**
 * Spread parameter for the O-1AB fuel type.
 */
export class O1abSpread implements SpreadAttribute {
  public a: number;
  public b: number;
  public c: number;
  public q: number;
  public bui0: number;
  public maxBe: number;
  public curingDegree: number;
  public o1AbStandingA: number;
  public o1AbStandingB: number;
  public o1AbStandingC: number;
  
  public constructor(init?: Partial<O1abSpread>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `O1ab|${this.a}|${this.b}|${this.c}|${this.q}|${this.bui0}|${this.maxBe}|${this.curingDegree}|${this.o1AbStandingA}|${this.o1AbStandingB}|${this.o1AbStandingC}`;
  }
}

/**
 * Spread parameter for non fuel types.
 */
export class NonSpread implements SpreadAttribute {
  
  public constructor(init?: Partial<NonSpread>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return 'Non';
  }
}

/**
 * Spread parameter for the M-1, M-2, M-1/M-2, NZ-54, and NZ-69 fuel types.
 */
export class MixedSpread implements SpreadAttribute {
  public q: number;
  public bui0: number;
  public maxBe: number;
  public height: number;
  public cbh: number;
  public cfl: number;
  public pc: number;
  public C2: FuelDefinition;
  public D1: FuelDefinition;
  
  public constructor(init?: Partial<MixedSpread>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    let s = `Mix|${this.q}|${this.bui0}|${this.maxBe}|${this.height}|${this.cbh}|${this.cfl}|${this.pc}`;
    if (this.C2 == null) {
      s += '|null';
    }
    else {
      s += `|${this.C2.toString()}`;
    }
    if (this.D1 == null) {
      s += '|null';
    }
    else {
      s += `|${this.D1.toString()}`;
    }
    
    return s;
  }
}

/**
 * Spread parameter for the M-3, M-4, and M-3/M-4 fuel types.
 */
export class MixedDeadSpread implements SpreadAttribute {
  public q: number;
  public bui0: number;
  public maxBe: number;
  public height: number;
  public cbh: number;
  public cfl: number;
  public pdf: number;
  public C2: FuelDefinition;
  public D1: FuelDefinition;
  
  public constructor(init?: Partial<MixedDeadSpread>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    let s = `Dead|${this.q}|${this.bui0}|${this.maxBe}|${this.height}|${this.cbh}|${this.cfl}|${this.pdf}`;
    if (this.C2 == null) {
      s += '|null';
    }
    else {
      s += `|${this.C2.toString()}`;
    }
    if (this.D1 == null) {
      s += '|null';
    }
    else {
      s += `|${this.D1.toString()}`;
    }
    
    return s;
  }
}

/**
 * FMC calculation parameters for the C-1, C-2, C-3, C-4, C-5, C-6, C-7, M-1, M-2, M-1/M-2, M-3, M-4, M-3/M-4, NZ-45,
 * NZ-47, NZ-51, NZ-52, NZ-54, NZ-55, NZ-56, NZ-57, NZ-58, NZ-60, NZ-61, NZ-66, NZ-67, NZ-69, NZ-70, and NZ-71 fuel types.
 */
export class FmcCalc implements FmcAttribute {
  public day0: number;
  
  public constructor(init?: Partial<FmcCalc>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `Calc|${this.day0}`;
  }
}

/**
 * FMC calculation parameters for the D-1, D-2, D-1/D-2, O-1a, O-1b, O-1AB, S-1, S-2, S-3, Non, NZ-2, NZ-15, NZ-30, NZ-31,
 * NZ-32, NZ-33, NZ-40, NZ-41, NZ-43, NZ-44, NZ-46, NZ-50, NZ-53, NZ-62, NZ-63, NZ-64, NZ-65, and NZ-68 fuel types.
 */
export class FmcNoCalc implements FmcAttribute {
  
  public constructor(init?: Partial<FmcNoCalc>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return 'No';
  }
}

/**
 * SFC calculation parameters for the C-1 and Non fuel types.
 */
export class C1Sfc implements SfcAttribute {
  public p1: number;
  public p2: number;
  public p3: number;
  public p4: number;
  public multiplier: number;
  
  public constructor(init?: Partial<C1Sfc>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `C1|${this.p1}|${this.p2}|${this.p3}|${this.p4}|${this.multiplier}`;
  }
}

/**
 * SFC calculation parameters for the C-2, C-3, C-4, C-5, C-6, D-1, D-1/D-2, M-3, M-4, M-3/M-4, NZ-54, NZ-60,
 * NZ-61, NZ-67, NZ-68, and NZ-69 fuel types.
 */
export class C2Sfc implements SfcAttribute {
  public p1: number;
  public p2: number;
  public power: number;
  public multiplier: number;
  
  public constructor(init?: Partial<C2Sfc>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `C2|${this.p1}|${this.p2}|${this.power}|${this.multiplier}`;
  }
}

/**
 * SFC calculation parameters for the C-7 fuel type.
 */
export class C7Sfc implements SfcAttribute {
  public p1F: number;
  public p2F: number;
  public p3F: number;
  public p1W: number;
  public p2W: number;
  public ffcMultiplier: number;
  public wfcMultiplier: number;
  public sfcMultiplier: number;
  
  public constructor(init?: Partial<C7Sfc>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `C7|${this.p1F}|${this.p2F}|${this.p3F}|${this.p1W}|${this.p2W}|${this.ffcMultiplier}|${this.wfcMultiplier}|${this.sfcMultiplier}`;
  }
}

/**
 * SFC calculation parameters for the D-2 and D-1/D-2 fuel types.
 */
export class D2Sfc implements SfcAttribute {
  public p1: number;
  public p2: number;
  public power: number;
  public multiplier: number;
  public threshold: number;
  public scale1: number;
  public scale2: number;
  
  public constructor(init?: Partial<D2Sfc>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `D2|${this.p1}|${this.p2}|${this.power}|${this.multiplier}|${this.threshold}|${this.scale1}|${this.scale2}`;
  }
}

/**
 * SFC calculation parameters for the M-1, M-2, and M-1/M-2 fuel types.
 */
export class M1Sfc implements SfcAttribute {
  
  public constructor(init?: Partial<M1Sfc>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return 'M1';
  }
}

/**
 * SFC calculation parameters for the O-1a, O-1b, O-1AB, NZ-2, NZ-15, NZ-30, NZ-31, NZ-32, NZ-33, NZ-40, NZ-41, NZ-43, NZ-44,
 * NZ-45, NZ-46, NZ-47, NZ-50, NZ-51, NZ-52, NZ-53, NZ-55, NZ-56, NZ-57, NZ-58, NZ-62, and NZ-70 fuel types.
 */
export class O1Sfc implements SfcAttribute {
  public fuelLoad: number;
  
  public constructor(init?: Partial<O1Sfc>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `O1|${this.fuelLoad}`;
  }
}

/**
 * SFC calculation parameters for the S-1, S-2, S-3, NZ-63, NZ-64, NZ-65, NZ-66, and NZ-71 fuel types.
 */
export class S1Sfc implements SfcAttribute {
  public p1F: number;
  public p2F: number;
  public p1W: number;
  public p2W: number;
  public ffcMultiplier: number;
  public wfcMultiplier: number;
  public sfcMultiplier: number;
  public ffcBuiMultiplier: number;
  public wfcBuiMultiplier: number;
  
  public constructor(init?: Partial<S1Sfc>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `S1|${this.p1F}|${this.p2F}|${this.p1W}|${this.p2W}|${this.ffcMultiplier}|${this.wfcMultiplier}|${this.sfcMultiplier}|${this.ffcBuiMultiplier}|${this.wfcBuiMultiplier}`;
  }
}

/**
 * RSI calculation parameters for the C-1, C-2, C-3, C-4, C-5, C-7, D-1, D-1/D-2, S-1, S-2, S-3, Non,
 * NZ-45, NZ-47, NZ-51, NZ-52, NZ-55, NZ-56, NZ-57, NZ-58, NZ-64, and NZ-68 fuel types.
 */
export class C1Rsi implements RsiAttribute {
  
  public constructor(init?: Partial<C1Rsi>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return 'C1';
  }
}

/**
 * RSI calculation parameters for the C-6, NZ-60, NZ-61, NZ-66, NZ-67, and NZ-71 fuel types.
 */
export class C6Rsi implements RsiAttribute {
  public fmeMultiplier: number;
  public fmePowAdder: number;
  public fmePowMultiplier: number;
  public fmeDivAdder: number;
  public fmeDivMultiplier: number;
  public fmePower: number;
  public rscMultiplier: number;
  public rscExpMultiplier: number;
  public fmeAvg: number;
  
  public constructor(init?: Partial<C6Rsi>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `C6|${this.fmeMultiplier}|${this.fmePowAdder}|${this.fmePowMultiplier}|${this.fmeDivAdder}|${this.fmeDivMultiplier}|${this.fmePower}|${this.rscMultiplier}|${this.rscExpMultiplier}|${this.fmeAvg}`;
  }
}

/**
 * RSI calculation parameters for the D-2 and D-1/D-2 fuel types.
 */
export class D2Rsi implements RsiAttribute {
  public threshold: number;
  public scale1: number;
  public scale2: number;
  
  public constructor(init?: Partial<D2Rsi>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `D2|${this.threshold}|${this.scale1}|${this.scale2}`;
  }
}

/**
 * RSI calculation parameters for the M-1, M-2, M-1/M-2, NZ-54, and NZ-69 fuel types.
 */
export class M1Rsi implements RsiAttribute {
  public p1: number;
  
  public constructor(init?: Partial<M1Rsi>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `M1|${this.p1}`;
  }
}

/**
 * RSI calculation parameters for the M-3 and M-3/M-4 (non-greenup) fuel types.
 */
export class M3Rsi implements RsiAttribute {
  public a: number;
  public b: number;
  public c: number;
  public p: number;
  
  public constructor(init?: Partial<M3Rsi>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `M3|${this.a}|${this.b}|${this.c}|${this.p}`;
  }
}

/**
 * RSI calculation parameters for the M-4 and M-3/M-4 (greenup) fuel types.
 */
export class M4Rsi implements RsiAttribute {
  public a: number;
  public b: number;
  public c: number;
  public d1A: number;
  public d1B: number;
  public d1C: number;
  public p: number;
  
  public constructor(init?: Partial<M4Rsi>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `M4|${this.a}|${this.b}|${this.c}|${this.d1A}|${this.d1B}|${this.d1C}|${this.p}`;
  }
}

/**
 * RSI calculation parameters for the O-1a, O-1b, O-1AB, NZ-2, NZ-15, NZ-30, NZ-31, NZ-32, NZ-33, NZ-40, NZ-41, NZ-43,
 * NZ-44, NZ-46, NZ-50, NZ-53, NZ-62, NZ-63, and NZ-65 fuel types.
 */
export class O1Rsi implements RsiAttribute {
  public threshold: number;
  public f1: number;
  public f2: number;
  public f3: number;
  public f4: number;
  
  public constructor(init?: Partial<O1Rsi>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `O1|${this.threshold}|${this.f1}|${this.f2}|${this.f3}|${this.f4}`;
  }
}

/**
 * RSI calculation parameters for the NZ-70 fuel type.
 */
export class ConstantRsi implements RsiAttribute {
  public rsi: number;
  
  public constructor(init?: Partial<ConstantRsi>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `Const|${this.rsi}`;
  }
}

/**
 * ISF calculation parameters for the C-1, C-2, C-3, C-4, C-5, C-6, C-7, D-1, D-2, D-1/D-2, S-1, S-2, S-3,
 * Non, NZ-45, NZ-47, NZ-51, NZ-52, NZ-55, NZ-56, NZ-57, NZ-58, NZ-60, NZ-61, NZ-64, NZ-66, NZ-67, NZ-68, NZ-70, and NZ-71 fuel types.
 */
export class C1Isf implements IsfAttribute {
  
  public constructor(init?: Partial<C1Isf>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return 'C1';
  }
}

/**
 * ISF calculation parameters for the M-1, M-2, M-1/M-2, NZ-54, and NZ-69 fuel types.
 */
export class M1Isf implements IsfAttribute {
  
  public constructor(init?: Partial<M1Isf>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return 'M1';
  }
}

/**
 * ISF calculation parameters for the M-3, M-4, and M-3/M-4 fuel types.
 */
export class M3M4Isf implements IsfAttribute {
  public a: number;
  public b: number;
  public c: number;
  
  public constructor(init?: Partial<M3M4Isf>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `M3M4|${this.a}|${this.b}|${this.c}`;
  }
}

/**
 * ISF calculation parameters for the O-1a, O-1b, O-1AB, NZ-2, NZ-15, NZ-30, NZ-31, NZ-32, NZ-33, NZ-40, NZ-41,
 * NZ-43, NZ-44, NZ-46, NZ-50, NZ-53, NZ-62, NZ-63, and NZ-65 fuel types.
 */
export class O1Isf implements IsfAttribute {
  public threshold: number;
  public f1: number;
  public f2: number;
  public f3: number;
  public f4: number;
  
  public constructor(init?: Partial<O1Isf>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `O1|${this.threshold}|${this.f1}|${this.f2}|${this.f3}|${this.f4}`;
  }
}

/**
 * ISF calculation parameters for the C-2, C-3, C-4, C-5, C-6, C-7, D-1, D-2, D-1/D-2, M-1, M-2, M-1/M-2, M-3, M-4, M-3/M-4,
 * NZ-45, NZ-47, NZ-51, NZ-52, NZ-54, NZ-55, NZ-56, NZ-57, NZ-58, NZ-60, NZ-61, NZ-66, NZ-67, NZ-68, NZ-69, and NZ-71 fuel types.
 */
export class ClosedAccAlpha implements AccAlphaAttribute {
  public init: number;
  public multiplier: number;
  public power: number;
  public expMultiplier: number;
  
  public constructor(init?: Partial<ClosedAccAlpha>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `Close|${this.init}|${this.multiplier}|${this.power}|${this.expMultiplier}`;
  }
}

/**
 * ISF calculation parameters for the C-1, O-1a, O-1b, O-1AB, S-1, S-2, S-3, Non, NZ-2, NZ-15, NZ-30, NZ-31,
 * NZ-32, NZ-33, NZ-40, NZ-41, NZ-43, NZ-44, NZ-46, NZ-50, NZ-53, NZ-62, NZ-63, NZ-64, NZ-65, and NZ-70 fuel types.
 */
export class OpenAccAlpha implements AccAlphaAttribute {
  public init: number;
  
  public constructor(init?: Partial<OpenAccAlpha>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `Open|${this.init}`;
  }
}

/**
 * ISF calculation parameters for the C-1, C-2, C-3, C-4, C-5, C-6, C-7, D-1, D-2, D-1/D-2, M-1, M-2, M-1/M-2, M-3, M-4, M-3/M-4, S-1, S-2, S-3,
 * Non, NZ-45, NZ-47, NZ-51, NZ-52, NZ-54, NZ-55, NZ-56, NZ-57, NZ-58, NZ-60, NZ-61, NZ-64, NZ-66, NZ-67, NZ-68, NZ-69, NZ-70, and NZ-71 fuel types.
 */
export class C1Lb implements LbAttribute {
  public init: number;
  public multiplier: number;
  public expMultiplier: number;
  public power: number;
  
  public constructor(init?: Partial<C1Lb>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `C1|${this.init}|${this.multiplier}|${this.expMultiplier}|${this.power}`;
  }
}

/**
 * ISF calculation parameters for the O-1a, O-1b, O-1AB, NZ-2, NZ-15, NZ-30, NZ-31,
 * NZ-32, NZ-33, NZ-40, NZ-41, NZ-43, NZ-44, NZ-46, NZ-50, NZ-53, NZ-62, NZ-63, and NZ-65 fuel types.
 */
export class O1Lb implements LbAttribute {
  public init: number;
  public power: number;
  
  public constructor(init?: Partial<O1Lb>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `O1|${this.init}|${this.power}`;
  }
}

/**
 * ISF calculation parameters for the C-1, C-2, C-3, C-4, C-5, C-6, C-7, D-1, D-1/D-2 (non-greenup), M-1, M-2, M-1/M-2,
 * M-3, M-4, M-3/M-4, O-1a, O-1b, O-1AB, S-1, S-2, S-3, Non, NZ-2, NZ-15, NZ-30, NZ-31, NZ-32, NZ-33, NZ-40, NZ-41,
 * NZ-43, NZ-44, NZ-45, NZ-46, NZ-47, NZ-50, NZ-51, NZ-52, NZ-53, NZ-54, NZ-55, NZ-56, NZ-57, NZ-58, NZ-60, NZ-61,
 * NZ-62, NZ-63, NZ-64, NZ-65, NZ-66, NZ-67, NZ-68, NZ-69, NZ-70, and NZ-71 fuel types.
 */
export class C1Cfb implements CfbAttribute {
  public csiMultiplier: number;
  public csiCbhExponent: number;
  public csiExpAdder: number;
  public csiExpMultiplier: number;
  public csiPower: number;
  public rsoDiv: number;
  public cfbExp: number;
  public cfbPossible: boolean;
  
  public constructor(init?: Partial<C1Cfb>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `C1|${this.csiMultiplier}|${this.csiCbhExponent}|${this.csiExpAdder}|${this.csiExpMultiplier}|${this.csiPower}|${this.rsoDiv}|${this.cfbExp}|${this.cfbPossible}`;
  }
}

/**
 * ISF calculation parameters for the D-2 and D-1/D-2 (greenup) fuel types.
 */
export class D2Cfb implements CfbAttribute {
  
  public constructor(init?: Partial<D2Cfb>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return 'D2';
  }
}

/**
 * Flame length calculation parameters for the O-1a, O-1b, O-1AB, S-1, S-2, S-3, Non, NZ-2, NZ-15, NZ-30,
 * NZ-31, NZ-32, NZ-33, NZ-40, NZ-41, NZ-43, NZ-44, NZ-46, NZ-50, NZ-53, NZ-62, NZ-63, NZ-64, and NZ-65 fuel types.
 */
export class Alexander82FlameLength implements FlameLengthAttribute {
  public p1: number;
  public p2: number;
  
  public constructor(init?: Partial<Alexander82FlameLength>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `Alex|${this.p1}|${this.p2}`;
  }
}

/**
 * Flame length calculation parameters for the C-1, C-2, C-3, C-4, C-5, C-6, C-7, D-1, D-2, D-1/D-2, M-1, M-2, M-1/M-2,
 * M-3, M-4, M-3/M-4, NZ-45, NZ-47, NZ-51, NZ-52, NZ-54, NZ-55, NZ-56, NZ-57, NZ-58, NZ-60, NZ-61, NZ-66, NZ-67, NZ-68,
 * NZ-69, NZ-70, and NZ-71 fuel types.
 */
export class Alexander82TreeFlameLength implements FlameLengthAttribute {
  public p1: number;
  public p2: number;
  public cfb: number;
  public th: number;
  
  public constructor(init?: Partial<Alexander82TreeFlameLength>) {
    Object.assign(this, init);
  }
  
  public stream(): string {
    return `AlexTree|${this.p1}|${this.p2}|${this.cfb}|${this.th}`;
  }
}

export interface Color {
  stream(): string;
}

/**
 * A color defined by red, green, and blue.
 */
export class RGBColor implements Color {
  /**
   * The red component of the color as an integer in [0, 255].
   */
  public red: number;
  
  /**
   * The green component of the color as an integer in [0, 255].
   */
  public green: number;
  
  /**
   * The blue component of the color as an integer in [0, 255].
   */
  public blue: number;
  
  public constructor(init?: Partial<RGBColor>) {
    Object.assign(this, init);
  }
  
  stream(): string {
    return `RGB|${this.red}|${this.green}|${this.blue}`;
  }
}

/**
 * A color defined by hue, saturation, and luminance.
 */
export class HSLColor implements Color {
  /**
   * The hue of the color as an integer in [0, 255].
   */
  public hue: number;
  
  /**
   * The saturation of the color as an integer in [0, 255].
   */
  public saturation: number;
  
  /**
   * The luminance of the color as an integer in [0, 255].
   */
  public luminance: number;
  
  public constructor(init?: Partial<HSLColor>) {
    Object.assign(this, init);
  }
  
  stream(): string {
    return `HSL|${this.hue}|${this.saturation}|${this.luminance}`;
  }
}

/**
 * The definition for a fuel type. Can be constructed from any combination of parameters,
 * even if potentially not valid for a real fuel type.
 */
export class FuelDefinition {
  
  /**
   * The name of the of the default fuel type that will be used to fill in
   * any unspecified parameters.
   */
  public defaultFuel: FuelTypes;
  
  /**
   * The user specified name for the fuel. If not present the value in {@link defaultName}
   * will be used.
   */
  public name: string;
  
  /**
   * A grid index code that will link this fuel type to a value in the fuel map.
   */
  public index: number;
  
  /**
   * A color to use to display the fuel if the created FGM were to be opened in Prometheus.
   * Can be either an {@link RGBColor} or an {@link HSLColor}.
   */
  public color: Color;
  
  /**
   * The spread parameters for the fuel being defined. Can be one of {@link C1Spread},
   * {@link C6Spread}, {@link S1Spread}, {@link D1Spread}, {@link NzSpread},
   * {@link O1Spread}, {@link O1abSpread}, {@link NonSpread}, {@link MixedSpread},
   * or {@link MixedDead}.
   */
  public spreadParms: SpreadAttribute;
  
  /**
   * The FMC calculation parameters for the fuel being defined. Can be one of {@link FmcCalc}
   * or {@link FmcNoCalc}.
   */
  public fmcAttribute: FmcAttribute;
  
  /**
   * The SFC calculation parameters for the fuel being defined. Can be one of {@link C1Sfc},
   * {@link C2Sfc}, {@link C7Sfc}, {@link D2Sfc}, {@link M1Sfc}, {@link O1Sfc}, or {@link S1Sfc}.
   */
  public sfcAttribute: SfcAttribute;
  
  /**
   * The SFC calculation parameters during greenup for the fuel being defined. Can be one of {@link C1Sfc},
   * {@link C2Sfc}, {@link C7Sfc}, {@link D2Sfc}, {@link M1Sfc}, {@link O1Sfc}, or {@link S1Sfc}.
   */
  public sfcGreenupAttribute: SfcAttribute;
  
  /**
   * The RSI calculation parameters for the fuel being defined. Can be one of {@link C1Rsi},
   * {@link C6Rsi}, {@link D2Rsi}, {@link M1Rsi}, {@link M3Rsi}, {@link M4Rsi}, {@link O1Rsi}, or {@link ConstantRsi}.
   */
  public rsiAttribute: RsiAttribute;
  
  /**
   * The RSI calculation parameters during greenup for the fuel being defined. Can be one of {@link C1Rsi},
   * {@link C6Rsi}, {@link D2Rsi}, {@link M1Rsi}, {@link M3Rsi}, {@link M4Rsi}, {@link O1Rsi}, or {@link ConstantRsi}.
   */
  public rsiGreenupAttribute: RsiAttribute;
  
  /**
   * The ISF calculation parameters for the fuel being defined. Can be one of {@link C1Isf},
   * {@link M1Isf}, {@link M3M4Isf}, or {@link O1Isf}.
   */
  public isfAttribute: IsfAttribute;
  
  /**
   * The ISF calculation parameters during greenup for the fuel being defined. Can be one of {@link C1Isf},
   * {@link M1Isf}, {@link M3M4Isf}, or {@link O1Isf}.
   */
  public isfGreenupAttribute: IsfAttribute;
  
  /**
   * The Acc Alpha calculation parameters for the fuel being defined. Can be one of {@link OpenAccAlpha} or {@link ClosedAccAlpha}.
   */
  public accAlphaAttribute: AccAlphaAttribute;
  
  /**
   * The LB calculation parameters for the fuel being defined. Can be one of {@link C1Lb} or {@link O1Lb}.
   */
  public lbAttribute: LbAttribute;
  
  /**
   * The CFB calculation parameters for the fuel being defined. Can be one of {@link C1Cfb} or {@link D2Cfb}.
   */
  public cfbAttribute: CfbAttribute;
  
  /**
   * The CFB calculation parameters during greenup for the fuel being defined. Can be one of {@link C1Cfb} or {@link D2Cfb}.
   */
  public cfbGreenupAttribute: CfbAttribute;
  
  /**
   * The flame length calculation parameters for the fuel being defined. Can be one of {@link Alexander82FlameLength}
   * or {@link OtherFlameLength}.
   */
  public flameLengthAttribute: FlameLengthAttribute;
  
  public constructor(name: string, defaultFuel: FuelTypes, index: number) {
    this.name = name;
    this.defaultFuel = defaultFuel;
    this.index = index;
    this.color = new RGBColor({ red: 0xff, green: 0xff, blue: 0xff });
  }
  
  public toString(): string {
    let s = `${this.name.replace("|", "_")}|${this.defaultFuel}|${this.index}|${this.color.stream()}`;
    if (this.spreadParms != null) {
      s += `|SP|${this.spreadParms.stream()}`;
    }
    if (this.fmcAttribute != null) {
      s += `|FMC|${this.fmcAttribute.stream()}`;
    }
    if (this.sfcAttribute != null) {
      s += `|SFC|${this.sfcAttribute.stream()}`;
    }
    if (this.sfcGreenupAttribute != null) {
      s += `|SFCG|${this.sfcGreenupAttribute.stream()}`;
    }
    if (this.rsiAttribute != null) {
      s += `|RSI|${this.rsiAttribute.stream()}`;
    }
    if (this.rsiGreenupAttribute != null) {
      s += `|RSIG|${this.rsiGreenupAttribute.stream()}`;
    }
    if (this.isfAttribute != null) {
      s += `|ISF|${this.isfAttribute.stream()}`;
    }
    if (this.isfGreenupAttribute != null) {
      s += `|ISFG|${this.isfGreenupAttribute.stream()}`;
    }
    if (this.accAlphaAttribute != null) {
      s += `|AA|${this.accAlphaAttribute.stream()}`;
    }
    if (this.lbAttribute != null) {
      s += `|LB|${this.lbAttribute.stream()}`;
    }
    if (this.cfbAttribute != null) {
      s += `|CFB|${this.cfbAttribute.stream()}`;
    }
    if (this.cfbGreenupAttribute != null) {
      s += `|CFBG|${this.cfbGreenupAttribute.stream()}`;
    }
    if (this.flameLengthAttribute != null) {
      s += `|FL|${this.flameLengthAttribute.stream()}`;
    }
    
    return s;
  }
}
