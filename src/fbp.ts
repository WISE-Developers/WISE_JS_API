/**
 * Request W.I.S.E. Builder to calculate FBP values from
 * the given inputs.
 * 
 * Example
 * -------
 * 
 * ```javascript
 * //cache the FBP fuel type defaults
 * let fuelCache = await FbpCalculations.getFuelsWithDefaultsPromise();
 * 
 * //populate the calculator with example values
 * let calculator = new FbpCalculations();
 * calculator.fuelType = "C-1";
 * calculator.elevation = 500;
 * calculator.useSlope = false;
 * calculator.slopeValue = 0;
 * calculator.aspect = 0;
 * calculator.useLine = false;
 * calculator.startTime = "2019-01-01T12:00:00";
 * calculator.elapsedTime = 60;
 * calculator.ffmc = 85;
 * calculator.bui = 40;
 * calculator.useBui = true;
 * calculator.windSpeed = 10;
 * calculator.windDirection = 0;
 * calculator.latitude = 62.454;
 * calculator.longitude = -114.3718;
 * await calculator.calculatePromise();
 * //******* calculator is now populated with FBP values **********
 * ```
 */

/** ignore this comment */
import * as net from "net";
import { SocketHelper, WISELogger, SocketMsg, IWISESerializable } from "./wiseGlobals";

export class FuelTypeDefaults {
  /**
   * Does the fuel type need a crown base height specified.
   */
  public useCrownBase: boolean;
  
  /**
   * Crown base height (m).
   */
  public crownBase: number;
  
  /**
   * Does the fuel type need a percent conifer specified.
   */
  public usePercentConifer: boolean;
  
  /**
   * Percent conifer (%).
   */
  public percentConifer: number;
  
  /**
   * Does the fuel type need a percent dead fir specified.
   */
  public usePercentDeadFir: boolean;
  
  /**
   * Percent dead fir (%).
   */
  public percentDeadFir: number;
  
  /**
   * Does the fuel type need a grass curing specified.
   */
  public useGrassCuring: boolean;
  
  /**
   * Percent grass curing (%).
   */
  public grassCuring: number;
  
  /**
   * Does the fuel type need a grass fuel load specified.
   */
  public useGrassFuelLoad: boolean;
  
  /**
   * Grass fuel load (km/m^2).
   */
  public grassFuelLoad: number;
  
  public constructor() {
    this.useCrownBase = false;
    this.usePercentConifer = false;
    this.usePercentDeadFir = false;
    this.useGrassCuring = false;
    this.useGrassFuelLoad = false;
  }
}

/**
 * An FBP fuel type.
 */
export class FuelType {
  /**
   * The name of the fuel.
   */
  public name: string;
  
  /**
   * A description of the fuel.
   */
  public desc: string;
  
  /**
   * The default values for the fuel type specified by {@link FuelType#name}.
   * Use {@link FbpCalculations#getFuelsWithDefaults()} to get fuel types with their default values.
   */
  public defaults: FuelTypeDefaults;
  
  /**
   * Get a full display string for the fuel type.
   */
  public toString = (): string => {
    return this.name + ": " + this.desc;
  }
}

export class FbpCalculations extends IWISESerializable {
  private static readonly CALCULATE_KEY = "FBP_CALCULATE";
  
  /**
   * [Input] The fuel type.
   */
  public fuelType: string;
  /**
   * [Input] Crown base height (m).
   */
  public crownBase: number|null;
  /**
   * [Input] Percent conifer.
   */
  public percentConifer: number|null;
  /**
   * [Input] Percent dead fir.
   */
  public percentDeadFir: number|null;
  /**
   * [Input] Percent grass curing.
   */
  public grassCuring: number|null;
  /**
   * [Input] Grass fuel load (kg/m^2).
   */
  public grassFuelLoad: number|null;
  /**
   * [Input] Fine fuel moisture code.
   */
  public ffmc: number;
  /**
   * [Input] The duff moisture code. Only needed if useBui is false.
   */
  public dmc: number;
  /**
   * [Input] The drought code. Only needed if useBui if false.
   */
  public dc: number;
  /**
   * [Input/Output] The buildup index. If useBui is true this value is used, otherwise it's calculated from the DMC and DC.
   */
  public bui: number;
  /**
   * [Input] If true the specified BUI is used, otherwise it is calulated from the DMC and DC.
   */
  public useBui: boolean;
  /**
   * [Input] The wind speed (km/h).
   */
  public windSpeed: number;
  /**
   * [Input] The wind direction (degrees).
   */
  public windDirection: number;
  /**
   * [Input] The elevation of the ignition.
   */
  public elevation: number;
  /**
   * [Input] The slope the ignition was on (ignored if useSlope is false).
   */
  public slopeValue: number;
  /**
   * [Input] Calculate with a slope value.
   */
  public useSlope: boolean;
  /**
   * [Input] The aspect the ignition was on.
   */
  public aspect: number;
  /**
   * [Input] Use a line ignition.
   */
  public useLine: boolean;
  /**
   * [Input] The date of the ignition.
   */
  public startTime: string;
  /**
   * [Input] Time elapsed since ignition (min).
   */
  public elapsedTime: number;
  /**
   * [Input] The latitude of the ignition (degrees).
   */
  public latitude: number;
  /**
   * [Input] The longitude of the ignition (degrees).
   */
  public longitude: number;
  
  
  /**
   * [Output] Rate or Spread, after elapsed time t.
   */
  public ros_t: number;
  /**
   * [Output] Rate of Spread, Equilibrium
   */
  public ros_eq: number;
  /**
   * [Output] Flank Rate of Spread
   */
  public fros: number;
  /**
   * [Output] Back Rate of Spread
   */
  public bros: number;
  /**
   * [Output] Critical Surface Fire Rate of Spread
   */
  public rso: number;
  /**
   * [Output] Head Fire Intensity
   */
  public hfi: number;
  /**
   * [Output] Flank Fire Intensity
   */
  public ffi: number;
  /**
   * [Output] Back Fire Intensity
   */
  public bfi: number;
  /**
   * [Output] Elliptical Fire Area
   */
  public area: number;
  /**
   * [Output] Elliptical Fire Perimeter
   */
  public perimeter: number;
  /**
   * [Output] Distance Head
   */
  public distanceHead: number;
  /**
   * [Output] Distance Flank
   */
  public distanceFlank: number;
  /**
   * [Output] Distance Back
   */
  public distanceBack: number;
  /**
   * [Output] Length-to-Breadth Ratio
   */
  public lb: number;
  /**
   * [Output] Critical Surface Fire Intensity
   */
  public csi: number;
  /**
   * [Output] Crown Fraction Burned
   */
  public cfb: number;
  /**
   * [Output] Surface Fuel Consumption
   */
  public sfc: number;
  /**
   * [Output] Total Fuel Consumption
   */
  public tfc: number;
  /**
   * [Output] Crown Fuel Consumption
   */
  public cfc: number;
  /**
   * [Output] Final ISI, accounting for wind and slope
   */
  public isi: number;
  /**
   * [Output] Foliar Moisture Content
   */
  public fmc: number;
  /**
   * [Output] Net Vectored Wind Speed
   */
  public wsv: number;
  /**
   * [Output] Spread direction azimuth
   */
  public raz: number;
  /**
   * [Output] A description of the fire
   */
  public fireDescription: string;
  
  /**
   * Have the output values been calculated.
   */
  public isCalculated: boolean;
  
  
  public constructor() {
    super();
    this.fuelType = "C-1";
    this.crownBase = 7;
    this.percentConifer = 50;
    this.percentDeadFir = 50;
    this.grassCuring = 60;
    this.grassFuelLoad = 0.35;
    this.ffmc = 85;
    this.dmc = 25;
    this.dc = 200;
    this.bui = 40;
    this.useBui = true;
    this.windSpeed = 0;
    this.windDirection = 0;
    this.elevation = 500;
    this.slopeValue = 0;
    this.useSlope = true;
    this.aspect = 0;
    this.useLine = false;
    this.startTime = "2019-01-01T12:00";
    this.elapsedTime = 60;
    this.latitude = 62.454;
    this.longitude = -114.3718;
    
    this.isCalculated = false;
  }
  
  /**
   * Set the fuel type. If the fuel type has defaults specified the required defaults will
   * override any value specified for them in this class.
   * @param fuelType The fuel type to use.
   */
  public setFuelType(fuelType: FuelType): void {
    this.fuelType = fuelType.name;
    if (fuelType.defaults != null) {
      if (fuelType.defaults.useCrownBase) {
        this.crownBase = fuelType.defaults.crownBase;
      }
      if (fuelType.defaults.usePercentConifer) {
        this.percentConifer = fuelType.defaults.percentConifer;
      }
      if (fuelType.defaults.usePercentDeadFir) {
        this.percentDeadFir = fuelType.defaults.percentDeadFir;
      }
      if (fuelType.defaults.useGrassCuring) {
        this.grassCuring = fuelType.defaults.grassCuring;
      }
      if (fuelType.defaults.useGrassFuelLoad) {
        this.grassFuelLoad = fuelType.defaults.grassFuelLoad;
      }
    }
  }
  
  /**
   * Unset the fuel type defaults
   */
  public unsetFuelType(): void {
    this.crownBase = null;
    this.percentConifer = null;
    this.percentDeadFir = null;
    this.grassCuring = null;
    this.grassFuelLoad = null;
  }
  
  /**
   * Calculate the FBP values. If there was an error during calculation a string indicating the cause of the error will be returned.
   */
  public calculate(callback?: (defaults: FbpCalculations) => any) {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    this.calculateInternal(callback);
  }
  
  /**
   * Calculate the FBP values. If there was an error during calculation a string indicating the cause of the error will be returned.
   * @returns The current {@link FbpCalculations} object.
   * @throws This method can only be called once at a time per instance.
   */
  public async calculatePromise(): Promise<FbpCalculations> {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    return await new Promise<FbpCalculations>((resolve, reject) => {
      this.calculateInternal(resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /*
   * Connect to the builder and retrieve the FBP values
   * @returns Sets the isCalculated boolean based on the retrieval's success
   */
  private calculateInternal(callback?: (defaults: FbpCalculations) => any, error?: (message: any) => any) {
    this.fetchState = -1;
    let stream = this.fuelType + '|' + this.crownBase + '|' + this.percentConifer + '|' + this.percentDeadFir;
    stream = stream + '|' + this.grassCuring + '|' + this.grassFuelLoad + '|' + this.ffmc + '|' + this.dmc;
    stream = stream + '|' + this.dc + '|' + this.bui + '|' + this.useBui + '|' + this.windSpeed;
    stream = stream + '|' + this.windDirection + '|' + this.elevation + '|' + this.slopeValue + '|' + this.useSlope;
    stream = stream + '|' + this.aspect + '|' + this.useLine + '|' + this.startTime + '|' + this.elapsedTime;
    stream = stream + '|' + this.latitude + '|' + this.longitude;
    
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      WISELogger.getInstance().debug("connected to builder, calculating FBP values !");
      builder.write(SocketMsg.STARTUP + SocketMsg.NEWLINE);
      builder.write(FbpCalculations.CALCULATE_KEY + SocketMsg.NEWLINE);
      builder.write(stream + SocketMsg.NEWLINE);
    });
    builder.on('data', (data) => {
      let rawDefaults = data.toString();
      let list = rawDefaults.split('|');
      if (list.length == 25) {
        this.ros_t = +list[0];
        this.ros_eq = +list[1];
        this.fros = +list[2];
        this.lb = +list[3];
        this.bros = +list[4];
        this.rso = +list[5];
        this.hfi = +list[6];
        this.ffi = +list[7];
        this.bfi = +list[8];
        this.area = +list[9];
        this.perimeter = +list[10];
        this.distanceHead = +list[11];
        this.distanceBack = +list[12];
        this.distanceFlank = +list[13];
        this.csi = +list[14];
        this.cfb = +list[15];
        this.sfc = +list[16];
        this.tfc = +list[17];
        this.cfc = +list[18];
        this.isi = +list[19];
        this.fmc = +list[20];
        this.wsv = +list[21];
        this.raz = +list[22];
        this.fireDescription = list[23].replace(/\^/g, '\n');
        if (!this.useBui) {
          this.bui = +list[24];
        }
        this.isCalculated = true;
      }
      else {
        WISELogger.getInstance().error("Failed to calculate FBP values (" + rawDefaults + ")");
        this.isCalculated = false;
      }
      
      builder.write(SocketMsg.SHUTDOWN + SocketMsg.NEWLINE, (err) => {
        builder.end();
      });
    });
    if (error) {
      builder.on('error', (err) => {
        if (this.fetchState < 0) {
          this.fetchState = 2;
          error(err);
          builder.end();
        }
      });
    }
    builder.on('end', () => {
      if (callback && this.fetchState < 0) {
        this.fetchState = 1;
        callback(this);
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
  
  /**
   * Get the list of fuel types from the server.
   */
  public static getFuels(callback?: (defaults: FuelType[]) => any): void {
    (new FuelsGetter()).getFuels(callback);
  }
  
  /**
   * Get the list of fuel types from the server.
   * @returns An array of {@link FuelType} without the default values populated.
   */
  public static async getFuelsPromise(): Promise<Array<FuelType>> {
    return await new Promise<Array<FuelType>>((resolve, reject) => {
      (new FuelsGetter()).getFuels(resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /**
   * Get the list of fuel types from the server.
   */
  public static getFuelsWithDefaults(callback?: (defaults: FuelType[]) => any): void {
    (new FuelsGetter()).getFuelsWithDefaults(callback);
  }
  
  /**
   * Get the list of fuel types from the server.
   * @returns An array of {@link FuelType} with the default values populated.
   */
  public static async getFuelsWithDefaultsPromise(): Promise<Array<FuelType>> {
    return await new Promise<Array<FuelType>>((resolve, reject) => {
      (new FuelsGetter()).getFuelsWithDefaults(resolve, reject);
    })
    .catch(err => { throw err });
  }
}

/*
* This class contains methods used to connect to the 
* builder and retrieve fuel type information
*/
class FuelsGetter extends IWISESerializable {
  private static readonly GET_FUELS_KEY = "FBP_GET_FUELS";
  private static readonly GET_FUELS_V2_KEY = "FBP_GET_FUELS_V2";
  
  /*
   * This method connects to the builder and retrieves the fuel types
   * @returns An array of fuel types
   */
  public getFuels(callback?: (defaults: FuelType[]) => any, error?: (message: any) => any): void {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    let retval = new Array<FuelType>();
    this.fetchState = -1;
    
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      WISELogger.getInstance().debug("connected to builder, getting fuel types !");
      builder.write(SocketMsg.STARTUP + SocketMsg.NEWLINE);
      builder.write(FuelsGetter.GET_FUELS_KEY + SocketMsg.NEWLINE);
    });
    builder.on('data', (data) => {
      let rawDefaults = data.toString();
      let list = rawDefaults.split('|');
      for (let i = 0; i < list.length; ) {
        let el = new FuelType();
        el.name = list[i];
        i++;
        el.desc = list[i];
        i++;
        retval.push(el);
      }
      builder.write(SocketMsg.SHUTDOWN + SocketMsg.NEWLINE, (err) => {
        builder.end();
      });
    });
    if (error) {
      builder.on('error', (err) => {
        if (this.fetchState < 0) {
          this.fetchState = 2;
          error(err);
          builder.end();
        }
      });
    }
    builder.on('end', () => {
      if (callback && this.fetchState < 0) {
        this.fetchState = 1;
        callback(retval);
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
  
  /*
   * This method connects to the builder and retrieves the fuel types as well as their default values
   * @returns An array of fuel types 
   */
  public getFuelsWithDefaults(callback?: (defaults: FuelType[]) => any, error?: (message: any) => any): void {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    let retval = new Array<FuelType>();
    this.fetchState = -1;
    
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      WISELogger.getInstance().debug("connected to builder, getting fuel types !");
      builder.write(SocketMsg.STARTUP + SocketMsg.NEWLINE);
      builder.write(FuelsGetter.GET_FUELS_V2_KEY + SocketMsg.NEWLINE);
    });
    builder.on('data', (data) => {
      let rawDefaults = data.toString();
      let list = rawDefaults.split('|');
      for (let i = 0; i < list.length; ) {
        let el = new FuelType();
        el.name = list[i];
        i++;
        el.desc = list[i];
        i++;
        el.defaults = new FuelTypeDefaults();
        el.defaults.crownBase = +list[i];
        i++;
        el.defaults.percentConifer = +list[i];
        i++;
        el.defaults.percentDeadFir = +list[i];
        i++;
        el.defaults.grassCuring = +list[i];
        i++;
        el.defaults.grassFuelLoad = +list[i];
        i++;
        let bits = +list[i];
        el.defaults.useCrownBase = (bits & 1) > 0;
        el.defaults.usePercentConifer = (bits & 2) > 0;
        el.defaults.usePercentDeadFir = (bits & 4) > 0;
        el.defaults.useGrassCuring = (bits & 8) > 0;
        el.defaults.useGrassFuelLoad = (bits & 16) > 0;
        i++;
        retval.push(el);
      }
      builder.write(SocketMsg.SHUTDOWN + SocketMsg.NEWLINE, (err) => {
        builder.end();
      });
    });
    if (error) {
      builder.on('error', (err) => {
        if (this.fetchState < 0) {
          this.fetchState = 2;
          error(err);
          builder.end();
        }
      });
    }
    builder.on('end', () => {
      if (callback && this.fetchState < 0) {
        this.fetchState = 1;
        callback(retval);
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
}