/**
 * Global classes needed for multiple parts of the API.
 */

/** ignore this comment */
import { DateTime } from "luxon";
import * as net from "net";

export class SocketMsg {
  public static readonly STARTUP: string = "STARTUP";
  public static readonly SHUTDOWN: string = "SHUTDOWN";
  public static readonly BEGINDATA: string = "BEGINDATA";
  public static readonly ENDDATA: string = "ENDDATA";
  public static readonly STARTJOB: string = "STARTJOB";
  public static readonly GETDEFAULTS: string = "GETDEFAULTS";
  public static readonly GETTIMEZONES: string = "LIST_TIMEZONES";
  
  public static readonly NEWLINE: string = "\n";
  
  public static skipFileTests: boolean = false;
  public static inlineThrowOnError: boolean = false;
}

export class SocketHelper {
  private port: number = 80;
  private address: string = "8.8.8.8";
  private static instance: SocketHelper;
  
  private constructor() { }
  
  public static getInstance() {
    if (!SocketHelper.instance) {
      SocketHelper.instance = new SocketHelper();
    }
    return SocketHelper.instance;
  }
  
  /**
   * Initialize the socket helper by setting the IP address and
   * port to be used to communicate with the Java builder application.
   * @param address The IP address of the computer running the Java builder application.
   * @param port The port to use to communicate with the Java builder application.
   */
  public static initialize(address: string, port: number) {
    let instance = SocketHelper.getInstance();
    instance.address = address;
    instance.port = port;
  }
  
  /**
   * Get the IP address to attempt to communicate with the Java builder with.
   * @return The IP address that is set for the computer running the Java builder.
   */
  public static getAddress(): string {
    let instance = SocketHelper.getInstance();
    return instance.address;
  }
  
  /**
   * Get the port to communicate with the Java builder over.
   * @return The port that will be used to communicate with the Java builder.
   */
  public static getPort(): number {
    let instance = SocketHelper.getInstance();
    return instance.port;
  }
}

export class IWISESerializable {
  protected fetchState: number = 0;
}

export enum Units {
  UNKNOWN = -1,
  /**
   * Kilometres
   */
  KM = 0,
  /**
   * Metres
   */
  M = 1,
  /**
   * Miles
   */
  MI = 2,
  /**
   * Feet
   */
  FT = 3,
  /**
   * Square Kilometres
   */
  KM2 = 4,
  /**
   * Square Metres
   */
  M2 = 5,
  /**
   * Square Miles
   */
  MI2 = 6,
  /**
   * Square Feet
   */
  FT2 = 7,
  /**
   * Hectares
   */
  HA = 8,
  /**
   * Square yards
   */
  YD2 = 9,
  /**
   * Acres
   */
  ACRE = 10,
  /**
   * Yards
   */
  YARD = 11,
  /**
   * Chains
   */
  CHAIN = 12
}

export enum Province {
  ALBERTA = "ab",
  BRITISH_COLUMBIA = "bc",
  MANITOBA = "mb",
  NEW_BRUNSWICK = "nb",
  NEWFOUNDLAND = "nl",
  NORTHWEST_TERRITORIES = "nt",
  NOVA_SCOTIA = "ns",
  NUNAVUT = "nu",
  ONTARIO = "on",
  PRINCE_EDWARD_ISLAND = "pe",
  QUEBEC = "qc",
  SASKATCHEWAN = "sk",
  YUKON_TERRITORY = "yt"
}

/**
 * A class to store location information.
 * @author "Travis Redpath"
 */
export class LatLon {
  /**
   * The locations latitude.
   */
  public latitude: number = 0;
  /**
   * The locations longitude.
   */
  public longitude: number = 0;
  
  /**
   * Construct a new LatLon with the given latitude and longitude.
   * @param lat The latitude.
   * @param lon The longitude.
   */
  public constructor(lat: number, lon: number) {
    this.latitude = lat;
    this.longitude = lon;
  }
}

/**
 * A class that stores information about a time duration.
 * @author "Travis Redpath"
 */
export class Duration {
  /**
   * The number of years in the duration. Leave as 0 or less for no years.
   */
  public years: number = -1;
  /**
   * The number of months in the duration. Leave as 0 or less for no months.
   */
  public months: number = -1;
  /**
   * The number of days in the duration. Leave as 0 or less for no days.
   */
  public days: number = -1;
  /**
   * The number of hours in the duration. Leave as 0 or less for no hours.
   */
  public hours: number = -1;
  /**
   * The number of minutes in the duration. Leave as 0 or less for no miutes.
   */
  public minutes: number = -1;
  /**
   * The number of seconds in the duration. Leave as 0 or less for no seconds.
   * Fractions of a second can be specified.
   */
  public seconds: number = -1;
  /**
   * Is the duration negative in direction.
   */
  public isNegative: boolean = false;
  
  //protected variables for parsing strings.
  protected _token: string = "";
  protected _tokenIndex: number = 0;
  protected _duration: string = "";
  
  /**
   * Is the duration valid (at least one value has been specified).
   * @return boolean
   */
  public isValid(): boolean {
    if (this.years < 0 && this.months < 0 && this.days < 0 && this.hours < 0 && this.minutes < 0 && this.seconds < 0) {
      return false;
    }
    return true;
  }
  
  /**
   * Is the current duration less than another.
   * @param other The other duration to compare against.
   * @internal
   */
  public isLessThan(other: Duration): boolean {
    const myDays = this.toDays();
    const otherDays = other.toDays();
    if (myDays < otherDays) {
      return true;
    }
    else if (myDays == otherDays) {
      return this.toSeconds() < other.toSeconds();
    }
    return false;
  }
  
  /**
   * Convert the days/hours/minutes/seconds portion of the duration into a number of seconds.
   * @returns The number of seconds represented by the duration. Will be negative if {@link Duration#isNegative} is true.
   * @internal
   */
  public toSeconds(): number {
    let val = 0;
    if (this.seconds > 0) {
      val = val + this.seconds;
    }
    if (this.minutes > 0) {
      val = val + (60 * this.minutes);
    }
    if (this.hours > 0) {
      val = val + (3600 * this.hours);
    }
    if (this.isNegative) {
      return -val;
    }
    return val;
  }
  
  /**
   * Convert the years/months/days portion of the duration into a number of days. Will be an
   * approximation because the duration doesn't reference a specific year.
   * @returns The number of days represented by the duration. Will be negative if {@link Duration#isNegative} is true.
   * @internal
   */
  public toDays(): number {
    let val = 0;
    if (this.hours > 0) {
      val = val + (this.hours / 24);
    }
    if (this.days > 0) {
      val = val + this.days;
    }
    if (this.months > 0) {
      val = val + (30 * this.months);
    }
    if (this.years > 0) {
      val = val + (365.25 * this.years);
    }
    if (this.isNegative) {
      return -val;
    }
    return val;
  }
  
  /**
   * Create a new time duration.
   * @param years
   * @param months
   * @param days
   * @param hours
   * @param minutes
   * @param seconds
   * @param negative Is the duration negative in time.
   */
  public static createDateTime(years: number, months: number, days: number, hours: number, minutes: number, seconds: number, negative: boolean) {
    let v = new Duration();
    v.years = Math.round(years);
    v.months = Math.round(months);
    v.days = Math.round(days);
    v.hours = Math.round(hours);
    v.minutes = Math.round(minutes);
    v.seconds = Math.round(seconds);
    v.isNegative = negative;
    return v;
  }
  
  /**
   * Create a new time duration with only date parameters.
   * @param years
   * @param months
   * @param days
   * @param negative Is the duration negative in time.
   */
  public static createDate(years: number, months: number, days: number, negative: boolean) {
    let v = new Duration();
    v.years = Math.round(years);
    v.months = Math.round(months);
    v.days = Math.round(days);
    v.isNegative = negative;
    return v;
  }
  
  /**
   * Create a new time duration with only time parameters.
   * @param hours
   * @param minutes
   * @param seconds
   * @param negative Is the duration negative in time.
   */
  public static createTime(hours: number, minutes: number, seconds: number, negative: boolean) {
    let v = new Duration();
    v.hours = Math.round(hours);
    v.minutes = Math.round(minutes);
    v.seconds = Math.round(seconds);
    v.isNegative = negative;
    return v;
  }
  
  /**
   * Convert the Duration into a properly formatted xml duration string.
   */
  public toString = (): string => {
    let temp = "";
    if (this.isNegative) {
      temp = '-P';
    }
    else {
      temp = 'P';
    }
    if (this.years > 0) {
      temp = temp + this.years + 'Y';
    }
    if (this.months > 0) {
      temp = temp + this.months + 'M';
    }
    if (this.days > 0) {
      temp = temp + this.days + 'D';
    }
    if (this.hours > 0 || this.minutes > 0 || this.seconds > 0) {
      temp = temp + 'T';
      if (this.hours > 0) {
        temp = temp + this.hours + 'H';
      }
      if (this.minutes > 0) {
        temp = temp + this.minutes + 'M';
      }
      if (this.seconds > 0) {
        temp = temp + this.seconds + 'S';
      }
    }
    if (temp === "P" || temp === "-P") {
      temp = temp + "T0S";
    }
    return temp;
  }
  
  /**
   * Convert an xml duration string into a Duration object.
   * @param val The xml duration string. An exception will be thrown if the string is not in the correct format.
   */
  public fromString(val: string) {
    this._tokenIndex = 0;
    this._duration = val;
    this.isNegative = false;
    this.years = -1;
    this.days = -1;
    this.months = -1;
    this.hours = -1;
    this.minutes = -1;
    this.seconds = -1;
    this._parse();
  }
  
  protected _parse() {
    this._nextToken();
    if (this._token === '-') {
      this.isNegative = true;
      this._nextToken();
    }
    
    if (this._token !== 'P') {
      throw new SyntaxError(`Duration '${this._duration}' is not in the xml duration format`);
    }
    
    this._parseDate();
  }
  
  protected _parseDate() {
    this._nextToken();
    if (this._token === 'T') {
      this._parseTime();
    }
    else if (!isNaN(+this._token)) {
      let num = '';
      while (!isNaN(+this._token)) {
        num += this._token;
        this._nextToken();
      }
      this._parseDateModifier(num);
      this._parseDate();
    }
  }
  
  protected _parseDateModifier(num: string) {
    if (this._token === 'Y') {
      this.years = parseInt(num);
    }
    else if (this._token === 'M') {
      this.months = parseInt(num);
    }
    else if (this._token === 'D') {
      this.days = parseInt(num);
    }
    else {
      throw new SyntaxError("Unrecognized token '${this._token}' in '${this._duration}'");
    }
  }
  
  protected _parseTime() {
    this._nextToken();
    if (!isNaN(+this._token)) {
      let num = '';
      while (!isNaN(+this._token) || this._token === '.') {
        num += this._token;
        this._nextToken();
      }
      this._parseTimeModifier(num);
      this._parseTime();
    }
  }
  
  protected _parseTimeModifier(num: string) {
    if (this._token === 'H') {
      this.hours = parseInt(num);
    }
    else if (this._token === 'M') {
      this.minutes = parseInt(num);
    }
    else if (this._token === 'S') {
      this.seconds = parseInt(num);
    }
    else {
      throw new SyntaxError("Unrecognized token '${this._token}' in '${this._duration}'");
    }
  }
  
  protected _nextToken() {
    if (this._tokenIndex >= this._duration.length) {
      return null;
    }
    this._token = this._duration[this._tokenIndex];
    this._tokenIndex += 1;
    return this._token;
  }
}

/**
 * A range of times represented by a start and end time.
 */
export class TimeRange {
  /**
   * The start of the time range. Can either be an ISO8601 formatted string
   * or a luxon {@link DateTime}.
   */
  public startTime: string|DateTime;
  
  /**
   * The end of the time range. Can either be an ISO8601 formatted string
   * or a luxon {@link DateTime}.
   */
  public endTime: string|DateTime;
  
  public constructor(startTime: string|DateTime, endTime: string|DateTime) {
    this.startTime = startTime;
    this.endTime = endTime;
  }
}

/**
* An error type indicating that a {@link Duration} is not valid.
*/
class DurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "DurationError";
  }
}

/**
 * A class to hold information about time zone names retrieved from Java.
 * The value is what will be passed back to the job builder.
 * @author "Travis Redpath"
 */
export class TimezoneName {
  /**
   * The name of the time zone to display to the user.
   */
  public name: string = "";
  /**
   * A unique identifier for the time zone that can be
   * passed to the job builder in place of a time zone
   * offset.
   */
  public value: number = -1;
}

/**
 * A timezone.
 * @author "Travis Redpath"
 */
export class Timezone {
  private static readonly PARAM_TIMEZONE = "timezone";
  
  /**
   * Is the timezone currently in daylight savings time.
   */
  public dst: boolean = false;
  /**
   * The offset from GMT.
   */
  private _offset: Duration;
  /**
   * Get the offset from GMT.
   */
  get offset(): Duration {
    return this._offset;
  }
  /**
   * Set the offset from GMT.
   */
  set offset(value: Duration) {
    if (SocketMsg.inlineThrowOnError && !value.isValid()) {
      throw new DurationError("The timezone offset must be a valid Duration.");
    }
    this._offset = value;
  }
  
  /**
   * Optional value of the timezone. If set to a valid value, the offset will be
   * looked up once the job is submitted so {@link Timezone#offset} and {@link Timezone#dst}
   * will be ignored. Valid values can be obtained by calling {@link Timezone#getTimezoneList()}.
   */
  public value: number;
  
  /**
   * Construct a new timezone.
   */
  public constructor() {
    this._offset = new Duration();
    this.value = -1;
  }
  
  /**
   * Is the timezone valid.
   */
  public isValid(): boolean {
    let err = this.checkValid();
    return err.length == 0;
  }
  
  /**
   * Check to find errors in the timezone.
   */
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    if (this.value < 0) {
      if (!this._offset.isValid()) {
        errs.push(new ValidationError("offset", "The timezone offset is not valid.", this));
      }
    }
    return errs;
  }
  
  /**
   * Streams the timezone to a socket.
   * @param builder A socket connection to stream to.
   */
  public stream(builder: net.Socket): void {
    let tmp = "";
    if (this.value >= 0) {
      tmp = '' + this.value;
    }
    else {
      tmp = this._offset + '|' + (+this.dst);
    }
    builder.write(Timezone.PARAM_TIMEZONE + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
  
  private static ParseTimezone(str: string): Array<TimezoneName> {
    let zoneList = str.split('|');
    let retval = new Array<TimezoneName>();
    for (let i = 0; i < zoneList.length; ) {
      if (zoneList[i] == null || zoneList[i + 1] == null) {
        i += 2;
        continue;
      }
      let el = new TimezoneName();
      el.name = zoneList[i];
      i++;
      el.value = parseInt(zoneList[i]);
      i++;
      retval.push(el);
    }
    return retval;
  }
  
  /**
   * Gets a list of possible time zones from Java.
   * @return An array of timezone names.
   */
  public static getTimezoneNameList(callback?: (defaults: TimezoneName[]) => any): void {
    Timezone.getTimezoneList((str) => {
      let retval = this.ParseTimezone(str);
      if (callback) {
        callback(retval);
      }
    });
  }
  
  /**
   * Gets a list of possible time zones from Java.
   * @return An array of timezone names.
   */
  public static async getTimezoneNameListPromise(): Promise<TimezoneName[]> {
    let str = await Timezone.getTimezoneListPromise();
    return this.ParseTimezone(str);
  }
  
  /**
   * Gets a list of the possible time zones from Java. The list is combined into
   * a single string with name/value pairs separated by a '|'.
   * @deprecated Use {@link Timezone#getTimezoneNameList()} instead.
   */
  public static getTimezoneList(callback?: (defaults: string) => any): void {
    (new TimezoneGetter()).getTimezoneList(callback);
  }
  
  /**
   * Gets a list of the possible time zones from Java. The list is combined into
   * a single string with name/value pairs separated by a '|'.
   * @returns The list of timezone names and their UTC offsets in a single string separated by '|'.
   * @deprecated Use {@link Timezone#getTimezoneNameListPromise()} instead.
   */
  public static async getTimezoneListPromise(): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      (new TimezoneGetter()).getTimezoneList(resolve, reject);
    })
    .catch(err => { throw err });
  }
}

class TimezoneGetter extends IWISESerializable {
  
  /*
   * This method connects to the builder and retrieves the timezones
   * @returns A List of the retrieved timezones
   */
  public getTimezoneList(callback?: (defaults: string) => any, error?: (message: any) => any): void {
    this.fetchState = -1;
    let retval = '';
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      WISELogger.getInstance().debug("connected to builder, getting timezones !");
      builder.write(SocketMsg.GETTIMEZONES + SocketMsg.NEWLINE);
    });
    builder.on('data', (data) => {
      retval += data.toString();
      if (retval.indexOf("COMPLETE") >= 0) {
        let split = retval.split('\n');
        retval = split[0];
        builder.end();
      }
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

/**
* The affect that an asset will have on a simulation.
*/
export enum AssetOperation {
  /**
   * Stop the simulation after all assets have been reached.
   */
  STOP_AFTER_ALL = -1,
  /**
   * The asset will have no effect on the simulation. The arrival time will be noted then the simulation will continue.
   */
  NO_EFFECT = 0,
  /**
   * The simulation will stop as soon as the first asset has been reached.
   */
  STOP_IMMEDIATELY = 1,
  /**
   * The simulation will stop after a certain number of assets have been reached. The default is all assets.
   */
  STOP_AFTER_X = 2
}

/**
 * The fire growth model options.
 * @author "Travis Redpath"
 */
export class FGMOptions {
  public static readonly PARAM_MAXACCTS = "maxaccts";
  public static readonly PARAM_DISTRES = "distres";
  public static readonly PARAM_PERIMRES = "perimres";
  public static readonly PARAM_MINSPREADROS = "fgm_minspreadros";
  public static readonly PARAM_STOPGRIDEND = "stopatgridends";
  public static readonly PARAM_BREACHING = "breaching";
  public static readonly PARAM_DYNAMICTHRESHOLD = "fgm_dynamicthreshold";
  public static readonly PARAM_SPOTTING = "spotting";
  public static readonly PARAM_PURGENONDISPLAY = "fgm_purgenondisplay";
  public static readonly PARAM_DX = "fgm_dx";
  public static readonly PARAM_DY = "fgm_dy";
  public static readonly PARAM_DT = "fgm_dt";
  public static readonly PARAM_DWD = "fgm_dwd";
  public static readonly PARAM_OWD = "fgm_owd";
  public static readonly PARAM_DVD = "fgm_dvd";
  public static readonly PARAM_OVD = "fgm_ovd";
  public static readonly PARAM_GROWTHAPPLIED = "fgm_growthPercApplied";
  public static readonly PARAM_GROWTHPERC = "fgm_growthPercentile";
  public static readonly PARAM_SUPPRESS_TIGHT_CONCAVE = "fgm_suppressTightConcave";
  public static readonly PARAM_NON_FUELS_AS_VECTOR_BREAKS = "fgm_nonFuelsAsVectorBreaks";
  public static readonly PARAM_NON_FUELS_TO_VECTOR_BREAKS = "fgm_nonFuelsToVectorBreaks";
  public static readonly PARAM_USE_INDEPENDENT_TIMESTEPS = "fgm_useIndependentTimesteps";
  public static readonly PARAM_PERIMETER_SPACING = "fgm_perimeterSpacing";
  public static readonly PARAM_SIM_PROPS = "simulation_properties";
  public static readonly PARAM_FALSE_ORIGIN = "fgm_falseOrigin";
  public static readonly PARAM_FALSE_SCALING = "fgm_falseScaling";
  
  public static readonly DEFAULT_MAXACCTS = "MAXACCTS";
  public static readonly DEFAULT_DISTRES = "DISTRES";
  public static readonly DEFAULT_PERIMRES = "PERIMRES";
  public static readonly DEFAULT_MINSPREADROS = "fgmd_minspreadros";
  public static readonly DEFAULT_STOPGRIDEND = "STOPGRIDEND";
  public static readonly DEFAULT_BREACHING = "BREACHING";
  public static readonly DEFAULT_DYNAMICTHRESHOLD = "fgmd_dynamicthreshold";
  public static readonly DEFAULT_SPOTTING = "fgmd_spotting";
  public static readonly DEFAULT_PURGENONDISPLAY = "fgmd_purgenondisplay";
  public static readonly DEFAULT_DX = "fgmd_dx";
  public static readonly DEFAULT_DY = "fgmd_dy";
  public static readonly DEFAULT_DT = "fmgd_dt";
  public static readonly DEFAULT_GROWTHAPPLIED = "fgmd_growthPercApplied";
  public static readonly DEFAULT_GROWTHPERC = "fgmd_growthPercentile";
  
  /**
   * The maximum time step during acceleration (optional). This value must be <= 5min.
   * Has a default value.
   */
  private _maxAccTS: Duration|null = null;
  /**
   * Get the maximum time step during acceleration.
   */
  get maxAccTS(): Duration|null {
    return this._maxAccTS;
  }
  /**
   * Set the maximum time step during acceleration.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link DurationError} will be thrown if value is not valid.
   */
  set maxAccTS(value: Duration|null) {
    if (SocketMsg.inlineThrowOnError && value != null && !value.isValid()) {
      throw new DurationError("The maximum timestep during acceleration is not valid.");
    }
    this.distRes = null;
    this._maxAccTS = value;
  }
  /**
   * The distance resolution (required). Must be between 0.2 and 10.0.
   * Has a default value.
   */
  private _distRes: number|null = null;
  /**
   * Get the distance resolution.
   */
  get distRes(): number|null {
    return this._distRes;
  }
  /**
   * Set the distance resolution in metres. Must be in [0.2, 10.0].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set distRes(value: number|null) {
    if (SocketMsg.inlineThrowOnError && value != null && (value < 0.2 || value > 10.0)) {
      throw new RangeError("The distance resolution is not valid.");
    }
    this._distRes = value;
  }
  /**
   * The perimeter resolution (required). Must be between 0.2 and 10.0.
   * Has a default value.
   */
  private _perimRes: number|null = null;
  /**
   * Get the perimeter resolution.
   */
  get perimRes(): number|null {
    return this._perimRes;
  }
  /**
   * Set the perimeter resolution in metres. Must be in [0.2, 10.0].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set perimRes(value: number|null) {
    if (SocketMsg.inlineThrowOnError && value != null && (value < 0.2 || value > 10.0)) {
      throw new RangeError("The perimeter resolution is not valid.");
    }
    this._perimRes = value;
  }
  /**
   * Minimum Spreading ROS (optional). Must be between 0.0000001 and 1.0.
   * Has a default value.
   */
  private _minimumSpreadingROS: number|null = null;
  /**
   * Get the minimum spreading ROS.
   */
  get minimumSpreadingROS(): number|null {
    return this._minimumSpreadingROS;
  }
  /**
   * Set the minimum spreading ROS. Must be in [0.0000001, 1].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set minimumSpreadingROS(value: number|null) {
    if (SocketMsg.inlineThrowOnError && value != null && (value < 0.0000001 || value > 1.0)) {
      throw new RangeError("The minimum spreading ROS is not valid.");
    }
    this._minimumSpreadingROS = value;
  }
  /**
   * Whether to stop the fire spread when the simulated fire reaches the boundary of the grid data (required).
   * Has a default value.
   */
  public stopAtGridEnd: boolean = true;
  /**
   * Whether breaching is turned on or off (required).
   * Has a default value.
   */
  public breaching: boolean = false;
  /**
   * Whether using the dynamic spatial threshold algorithm is turned on or off (optional).
   * Has a default value.
   */
  public dynamicSpatialThreshold: boolean|null = null;
  /**
   * Whether the spotting model should be activated (optional).
   * Has a default value.
   */
  public spotting: boolean|null = null;
  /**
   * Whether internal/hidden time steps are retained.
   * Has a default value.
   */
  public purgeNonDisplayable: boolean|null = null;
  /**
   * How much to nudge ignitions to perform probabilistic analyses on ignition location.
   * Primarily used when ignition information is not 100% reliable.
   * Must be between -250 and 250.
   * Has a default value.
   */
  private _dx: number|null = null;
  /**
   * Get the distance to nudge ignitions to perform probabilistic analyses on ignition location.
   */
  get dx(): number|null {
    return this._dx;
  }
  /**
   * Set the distance to nudge ignitions to perform probabilistic analyses on ignition location, in metres. Must be between in [-250m, 250m].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set dx(value: number|null) {
    if (SocketMsg.inlineThrowOnError && value != null && (value < -250 || value > 250)) {
      throw new RangeError("The x ignition nudge distance is not valid.");
    }
    this._dx = value;
  }
  /**
   * How much to nudge ignitions to perform probabilistic analyses on ignition location.
   * Primarily used when ignition information is not 100% reliable.
   * Must be between -250 and 250.
   * Has a default value.
   */
  private _dy: number|null = null;
  /**
   * Get the distance to nudge ignitions to perform probabilistic analyses on ignition location.
   */
  get dy(): number|null {
    return this._dy;
  }
  /**
   * Set the distance to nudge ignitions to perform probabilistic analyses on ignition location, in metres. Must be between in [-250m, 250m].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set dy(value: number|null) {
    if (SocketMsg.inlineThrowOnError && value != null && (value < -250 || value > 250)) {
      throw new RangeError("The y ignition nudge distance is not valid.");
    }
    this._dy = value;
  }
  /**
   * How much to nudge ignitions to perform probabilistic analyses on ignition location and start time.
   * Primarily used when ignition information is not 100% reliable.
   * Has a default value.
   */
  private _dt: Duration|null = null;
  /**
   * Get the duration to nudge ignition start times to perform probabilistic analyses on ignition start time.
   */
  get dt(): Duration|null {
    return this._dt;
  }
  /**
   * Set the duration to nudge ignition start times to perform probabilistic analyses on ignition start times. Must be between in [-4h, 4h].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link DurationError} will be thrown if value is not valid.
   */
  set dt(value: Duration|null) {
    if (SocketMsg.inlineThrowOnError && value != null) {
      let testDuration = Duration.createTime(4, 0, 0, false);
      if (testDuration.isLessThan(value)) {
        throw new RangeError("The ignition start nudge duration is not valid.");
      }
      testDuration.isNegative = true;
      if (value.isLessThan(testDuration)) {
        throw new RangeError("The ignition start nudge duration is not valid.");
      }
    }
    this._dt = value;
  }
  /**
   * How much to nudge wind direction to perform probabilistic analyses on weather.
   * Applied after all patches and grids, and does not recalculate any FWI calculations.
   * Applied before any FBP calculations.
   * Provided in compass degrees, -360 to 360 is acceptable.
   * Applied to both simulations, and to instantaneous calculations as shown on the map trace view query, for consistency.
   * Primarily used when weather information does not have the expected fidelity.
   */
  private _dwd: number|null = null;
  /**
   * Get the distance to nudge wind directions to perform probabilistic analyses on weather.
   */
  get dwd(): number|null {
    return this._dwd;
  }
  /**
   * Set the distance to wind directions to perform probabilistic analyses on weather, in metres. Must be between in [-360, 360].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set dwd(value: number|null) {
    if (SocketMsg.inlineThrowOnError && value != null && (value < -360 || value > 360)) {
      throw new RangeError("The wind direction nudge distance is not valid.");
    }
    this._dwd = value;
  }
  /**
   * What to change the wind direction to, to perform probabilistic analyses on weather.
   * Applied after all patches and grids, and does not recalculate any FWI calculations.
   * Applied before any FBP calculations.
   * Provided in compass degrees, 0 to 360 is acceptable.
   * Applied to both simulations, and to instantaneous calculations as shown on the map trace view query, for consistency.
   */
  private _owd: number|null = null;
  /**
   * Get the value to override wind directions to perform probabilistic analyses on weather.
   */
  get owd(): number|null {
    return this._owd;
  }
  /**
   * Set the value to change the wind direction to for the entire grid, in compass degrees. Must be between in [0, 360).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set owd(value: number|null) {
    if (SocketMsg.inlineThrowOnError && value != null && (value < 0 || value >= 360)) {
      throw new RangeError("The wind direction override value is not valid.");
    }
    this._owd = value;
  }
  /**
   * Used to calculate grid-based statistics without modelling a fire. Where-as various inputs will determine the dimensions and
   * orientation of the ellipse representing fire growth at a location, this value determines the direction of vector growth out
   * of the defined ellipse. In this mode, provided FBP equationsa are used. oVD stands for overrideVectorDirection.
   * What to define (or change) the vector direction to.
   * Applied after all patches and grids, and does not recalculate any FWI calculations.
   * Provided in compass degrees, 0 to 360 is acceptable.
   */
  private _ovd: number|null = null;
  /**
   * Get the direction of vector growth out of a defined ellipse.
   */
  get ovd(): number|null {
    return this._ovd;
  }
  /**
   * Set the value of the vector growth out of a defined ellipse in compass degrees. Must be in [0, 360).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set ovd(value: number|null) {
    if (SocketMsg.inlineThrowOnError && value != null && (value < 0 || value >= 360)) {
      throw new RangeError("The vector growth direction is not valid.");
    }
    this._ovd = value;
  }
  /**
   * Used to calculate grid-based statistics without modelling a fire.  Where-as various inputs will determine the dimensions and
   * orientation of the ellipse representing fire growth at a location, this value determines the direction of vector growth out
   * of the defined ellipse.  In this mode, provided FBP equations are used.  dVD stands for deltaVectorDirection.
   * How much to nudge wind direction to perform probabilistic analyses on weather.
   * Applied after all patches and grids, and does not recalculate any FWI calculations.
   * Provided in compass degrees, -360 to 360 is acceptable.
   */
  private _dvd: number|null = null;
  /**
   * Get the amount to nudge the wind direction when performing probabilistic analyses on weather.
   */
  get dvd(): number|null {
    return this._dvd;
  }
  /**
   * Set the amount to nudge the wind direction when performing probabilistic analyses on weather. Must be in [-360, 360].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set dvd(value: number|null) {
    if (SocketMsg.inlineThrowOnError && value != null && (value < -360 || value > 360)) {
      throw new RangeError("The wind direction nudge distance for probabilistic analysis is not valid.");
    }
    this._dvd = value;
  }
  /**
   * Whether the growth percentile value is applied (optional).
   * Has a default value.
   */
  public growthPercentileApplied: boolean|null = null;
  /**
   * Growth percentile, to apply to specific fuel types (optional).
   * Has a default value.
   */
  private _growthPercentile: number|null = null;
  /**
   * Get the growth percentile.
   */
  get growthPercentile(): number|null {
    return this._growthPercentile;
  }
  /**
   * Set the growth percentile. Must be between in (0, 100).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set growthPercentile(value: number|null) {
    if (SocketMsg.inlineThrowOnError && value != null && (value <= 0 || value >= 100)) {
      throw new RangeError("The growth percentile is not valid.");
    }
    this._growthPercentile = value;
  }
  /**
   * Suppress adding new points to polygons in tight concave locations.
   */
  public suppressTightConcave: boolean|null = null;
  /**
   * Should non-fuel locations be used as vector breaks.
   * @deprecated
   */
  public nonFuelsAsVectorBreaks: boolean|null = null;
  /**
   * Should non-fuel locations be converted to vector breaks.
   * @deprecated
   */
  public nonFuelsToVectorBreaks: boolean|null = null;
  /**
   * Should independent timesteps be used when running scenarios.
   */
  public useIndependentTimesteps: boolean|null = null;
  /**
   * Value at which to enforce a minimum spacing of vertices on a fire perimeters, in metres.
   */
  private _perimeterSpacing: number|null = null;
  /**
   * Get the minimum enforced spacing of vertices on a fire perimeter.
   */
  get perimeterSpacing(): number|null {
    return this._perimeterSpacing;
  }
  /**
   * Set the minimum enforced spacing of vertices on a fire perimeter, in metres. Must be in [0.2, 10.0].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set perimeterSpacing(value: number|null) {
    if (SocketMsg.inlineThrowOnError && value != null && (value < 0.2 || value > 10.0)) {
      throw new RangeError("The perimeter spacing is not valid.");
    }
    this._perimeterSpacing = value;
  }
  /**
   * The initial number of vertices used to create a polygon aroung point ignitions.
   */
  private _initialVertexCount: number = 16;
  /**
   * Get the number of vertices to use when creating a polygon around point ignitions.
   */
  get initialVertexCount(): number {
    return this._initialVertexCount;
  }
  /**
   * Set the number of vertices to use when creating a polygon around point ignitions. Must be between in [6, 64].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set initialVertexCount(value: number) {
    if (SocketMsg.inlineThrowOnError && (value == null || value < 6 || value > 64)) {
      throw new RangeError("The initial vertex count is not valid.");
    }
    this._initialVertexCount = value;
  }
  /**
   * The initial size of the polygon around point ignitions, in metres.
   */
  private _ignitionSize: number = 0.5;
  /**
   * Get the initial size of the polygon around point ignitions.
   */
  get ignitionSize(): number {
    return this._ignitionSize;
  }
  /**
   * Set the initial size of the polygon around point ignition, in metres. Must be between in (0, 25].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set ignitionSize(value: number) {
    if (SocketMsg.inlineThrowOnError && (value == null || value <= 0 || value > 25)) {
      throw new RangeError("The ignition size is not valid.");
    }
    this._ignitionSize = value;
  }
  /**
   * A global asset operation that can be used to force an asset behaviour for all attached assets.
   */
  public globalAssetOperation: AssetOperation = AssetOperation.STOP_AFTER_ALL;
  /**
   * An asset collision count. Will allow the simulation to be stopped after a certain number of assets have been reached.
   * Only valid if globalAssetOperation in AssetOperation::STOP_AFTER_X.
   */
  public assetCollisionCount: number = -1;
  
  /**
   * ![v7](https://img.shields.io/badge/-v7-blue)![2021.04.01](https://img.shields.io/badge/-2021.04.01-red)
   * 
   * Use a false origin to work with location information in the W.I.S.E. backend. Currently the origin will always be the
   * lower-left location of the fuel map.
   * 
   * This is a v7 only setting. On v6 false origin is always on.
   */
  public enableFalseOrigin: boolean = true;
  
  /**
   * ![v7](https://img.shields.io/badge/-v7-blue)![2021.04.01](https://img.shields.io/badge/-2021.04.01-red)
   * 
   * Use scaling to work with location information in the W.I.S.E. backend. Currently the scale will be the scale defined
   * in the fuel map's projection.
   * 
   * This is a v7 only setting. On v6 false scaling is always on.
   */
  public enableFalseScaling: boolean = true;
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the FGM options.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this.stopAtGridEnd == null) {
      errs.push(new ValidationError("stopAtGridEnd", "Whether to the simulation should stop if it reaches the grid boundary is not set.", this));
    }
    if (this.breaching == null) {
      errs.push(new ValidationError("breaching", "Whether breaching should be used is not set.", this));
    }
    if (this._maxAccTS == null) {
      errs.push(new ValidationError("maxAccTS", "The maximum timestep to use during acceleration is not set.", this));
    }
    else if (!this._maxAccTS.isValid()) {
      errs.push(new ValidationError("maxAccTS", "The maximum timestep to use during acceleration is not valid.", this));
    }
    if (this.spotting == null) {
      errs.push(new ValidationError("spotting", "Whether spotting should be used is not set.", this));
    }
    if (this._distRes == null) {
      errs.push(new ValidationError("distRes", "The distance resolution is not set.", this));
    }
    else if (this._distRes < 0.2 || this._distRes > 10.0) {
      errs.push(new ValidationError("distRes", "The specified distance resolution is invalid.", this));
    }
    if (this._perimRes == null) {
      errs.push(new ValidationError("perimRes", "The perimeter resolution is not set.", this));
    }
    else if (this._perimRes < 0.2 || this._perimRes > 10.0) {
      errs.push(new ValidationError("perimRes", "The perimeter resolution is not valid.", this));
    }
    if (this._minimumSpreadingROS != null) {
      if(this._minimumSpreadingROS < 0.0000001 || this._minimumSpreadingROS > 1.0) {
        errs.push(new ValidationError("minimumSpreadingROS", "The minimum spreading ROS is set but is not valid.", this));
      }
    }
    if (this._dx != null) {
      if (this._dx < -250.0 || this._dx > 250.0) {
        errs.push(new ValidationError("dx", "A delta value for the x direction of the ignition points is set but is not valid.", this));
      }
    }
    if (this._dy != null) {
      if (this._dy < -250.0 || this._dy > 250.0) {
        errs.push(new ValidationError("dy", "A delta value for the y direction of the ignition points is set but is not valid.", this));
      }
    }
    if (this._dt != null) {
      if (this._dt.hours < -4.0 || this._dt.hours > 4.0){
        errs.push(new ValidationError("dt", "A delta value for the start time of the ignition points is set but is not valid.", this));
      }
    }
    if (this._dwd != null) {
      if (this._dwd < -360.0 || this._dwd > 360.0) {
        errs.push(new ValidationError("dwd", "A delta value for the wind direction is set but is not valid.", this));
      }
    }
    if (this._owd != null) {
      if (this._owd < 0.0 || this._owd >= 360.0) {
        errs.push(new ValidationError("owd", "A wind direction override value is set but is not valid.", this));
      }
    }
    if (this._dvd != null) {
      if (this._dvd < -360.0 || this._dvd > 360.0) {
        errs.push(new ValidationError("dvd", "A delta value for the wind direction on probabilistic analysis is set but is not valid.", this));
      }
    }
    if (this._ovd != null) {
      if (this._ovd < 0.0 || this._ovd >= 360.0) {
        errs.push(new ValidationError("ovd", "A vector growth direction is set but is not valid.", this));
      }
    }
    if (this.growthPercentileApplied != null && this.growthPercentileApplied) {
      if (this._growthPercentile == null || this._growthPercentile <= 0.0 || this._growthPercentile >= 100.0) {
        errs.push(new ValidationError("growthPercentile", "Growth percentile is enabled but the specified growth percentile is not valid.", this));
      }
    }
    if (this._perimeterSpacing != null && (this._perimeterSpacing < 0.0 || this._perimeterSpacing > 10.0)) {
      errs.push(new ValidationError("perimeterSpacing", "The specified perimeter spacing is not valid.", this));
    }
    if (this._initialVertexCount < 6 || this._initialVertexCount > 64) {
      errs.push(new ValidationError("initialVertexCount", "The specified initial vertex count is not valid.", this));
    }
    if (this._ignitionSize <= 0.0 || this._ignitionSize > 25.0) {
      errs.push(new ValidationError("ignitionSize", "The specified ignition size is not valid.", this));
    }
    if (this.globalAssetOperation == AssetOperation.STOP_AFTER_X && this.assetCollisionCount < 0) {
      errs.push(new ValidationError("assetCollisionCount", "The number of assets to stop the simulation after reaching has not been set.", this));
    }
    
    return errs;
  }
  
  /**
   * Check to see if the type is part of this class. Assign $data to the appropriate variable if it is.
   * @param type
   * @param data
   */
  public tryParse(type: string, data: string): boolean {
    if (type === FGMOptions.DEFAULT_MAXACCTS) {
      this._maxAccTS = new Duration();
      this._maxAccTS.fromString(data);
      return true;
    }
    else if (type === FGMOptions.DEFAULT_DISTRES) {
      this._distRes = parseInt(data);
      return true;
    }
    else if (type === FGMOptions.DEFAULT_PERIMRES) {
      this._perimRes = parseInt(data);
      return true;
    }
    else if (type === FGMOptions.DEFAULT_MINSPREADROS) {
      this._minimumSpreadingROS = parseFloat(data);
      return true;
    }
    else if (type === FGMOptions.DEFAULT_STOPGRIDEND) {
      this.stopAtGridEnd = !!data;
      return true;
    }
    else if (type === FGMOptions.DEFAULT_BREACHING) {
      this.breaching = !!data;
      return true;
    }
    else if (type === FGMOptions.DEFAULT_DYNAMICTHRESHOLD) {
      this.dynamicSpatialThreshold = !!data;
      return true;
    }
    else if (type === FGMOptions.DEFAULT_SPOTTING) {
      this.spotting = !!data;
      return true;
    }
    else if (type === FGMOptions.DEFAULT_PURGENONDISPLAY) {
      this.purgeNonDisplayable = !!data;
      return true;
    }
    else if (type === FGMOptions.DEFAULT_DX) {
      this._dx = parseFloat(data);
      return true;
    }
    else if (type === FGMOptions.DEFAULT_DY) {
      this._dy = parseFloat(data);
      return true;
    }
    else if (type === FGMOptions.DEFAULT_DT) {
      this._dt = new Duration();
      this._dt.fromString(data);
      return true;
    }
    else if (type === FGMOptions.DEFAULT_GROWTHAPPLIED) {
      this.growthPercentileApplied = !!data;
      return true;
    }
    else if (type === FGMOptions.DEFAULT_GROWTHPERC) {
      this._growthPercentile = parseFloat(data);
      return true;
    }
    return false;
  }
  
  /**
   * Streams the FGM options to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    if (this._maxAccTS != null) {
      builder.write(FGMOptions.PARAM_MAXACCTS + SocketMsg.NEWLINE);
      builder.write(this._maxAccTS + SocketMsg.NEWLINE);
    }
    
    builder.write(FGMOptions.PARAM_DISTRES + SocketMsg.NEWLINE);
    builder.write(this._distRes + SocketMsg.NEWLINE);
    
    builder.write(FGMOptions.PARAM_PERIMRES + SocketMsg.NEWLINE);
    builder.write(this._perimRes + SocketMsg.NEWLINE);
    
    if (this._minimumSpreadingROS != null) {
      builder.write(FGMOptions.PARAM_MINSPREADROS + SocketMsg.NEWLINE);
      builder.write(this._minimumSpreadingROS + SocketMsg.NEWLINE);
    }
    
    builder.write(FGMOptions.PARAM_STOPGRIDEND + SocketMsg.NEWLINE);
    builder.write((+this.stopAtGridEnd) + SocketMsg.NEWLINE);
    
    builder.write(FGMOptions.PARAM_BREACHING + SocketMsg.NEWLINE);
    builder.write((+this.breaching) + SocketMsg.NEWLINE);
    
    if (this.dynamicSpatialThreshold != null) {
      builder.write(FGMOptions.PARAM_DYNAMICTHRESHOLD + SocketMsg.NEWLINE);
      builder.write((+this.dynamicSpatialThreshold) + SocketMsg.NEWLINE);
    }
    
    if (this.spotting != null) {
      builder.write(FGMOptions.PARAM_SPOTTING + SocketMsg.NEWLINE);
      builder.write((+this.spotting) + SocketMsg.NEWLINE);
    }
    
    if (this.purgeNonDisplayable != null) {
      builder.write(FGMOptions.PARAM_PURGENONDISPLAY + SocketMsg.NEWLINE);
      builder.write((+this.purgeNonDisplayable) + SocketMsg.NEWLINE);
    }
    
    if (this._dx != null) {
      builder.write(FGMOptions.PARAM_DX + SocketMsg.NEWLINE);
      builder.write(this._dx + SocketMsg.NEWLINE);
    }
    
    if (this._dy != null) {
      builder.write(FGMOptions.PARAM_DY + SocketMsg.NEWLINE);
      builder.write(this._dy + SocketMsg.NEWLINE);
    }
    
    if (this._dt != null) {
      builder.write(FGMOptions.PARAM_DT + SocketMsg.NEWLINE);
      builder.write(this._dt + SocketMsg.NEWLINE);
    }
    
    if (this._dwd != null) {
      builder.write(FGMOptions.PARAM_DWD + SocketMsg.NEWLINE);
      builder.write(this._dwd + SocketMsg.NEWLINE);
    }
    
    if (this._owd != null) {
      builder.write(FGMOptions.PARAM_OWD + SocketMsg.NEWLINE);
      builder.write(this._owd + SocketMsg.NEWLINE);
    }
    
    if (this._dvd != null) {
      builder.write(FGMOptions.PARAM_DVD + SocketMsg.NEWLINE);
      builder.write(this._dvd + SocketMsg.NEWLINE);
    }
    
    if (this._ovd != null) {
      builder.write(FGMOptions.PARAM_OVD + SocketMsg.NEWLINE);
      builder.write(this._ovd + SocketMsg.NEWLINE);
    }
    
    if (this.growthPercentileApplied != null) {
      builder.write(FGMOptions.PARAM_GROWTHAPPLIED + SocketMsg.NEWLINE);
      builder.write((+this.growthPercentileApplied) + SocketMsg.NEWLINE);
    }
    
    if (this._growthPercentile != null) {
      builder.write(FGMOptions.PARAM_GROWTHPERC + SocketMsg.NEWLINE);
      builder.write(this._growthPercentile + SocketMsg.NEWLINE);
    }
    
    if (this.suppressTightConcave != null) {
      builder.write(FGMOptions.PARAM_SUPPRESS_TIGHT_CONCAVE + SocketMsg.NEWLINE);
      builder.write((+this.suppressTightConcave) + SocketMsg.NEWLINE);
    }
    
    if (this.nonFuelsAsVectorBreaks != null) {
      builder.write(FGMOptions.PARAM_NON_FUELS_AS_VECTOR_BREAKS + SocketMsg.NEWLINE);
      builder.write((+this.nonFuelsAsVectorBreaks) + SocketMsg.NEWLINE);
    }
    
    if (this.nonFuelsToVectorBreaks != null) {
      builder.write(FGMOptions.PARAM_NON_FUELS_TO_VECTOR_BREAKS + SocketMsg.NEWLINE);
      builder.write((+this.nonFuelsToVectorBreaks) + SocketMsg.NEWLINE);
    }
    
    if (this.useIndependentTimesteps != null) {
      builder.write(FGMOptions.PARAM_USE_INDEPENDENT_TIMESTEPS + SocketMsg.NEWLINE);
      builder.write((+this.useIndependentTimesteps) + SocketMsg.NEWLINE);
    }
    
    if (this._perimeterSpacing != null) {
      builder.write(FGMOptions.PARAM_PERIMETER_SPACING + SocketMsg.NEWLINE);
      builder.write(this._perimeterSpacing + SocketMsg.NEWLINE);
    }
    
    builder.write(FGMOptions.PARAM_FALSE_ORIGIN + SocketMsg.NEWLINE);
    builder.write((+this.enableFalseOrigin) + SocketMsg.NEWLINE);
    
    builder.write(FGMOptions.PARAM_FALSE_SCALING + SocketMsg.NEWLINE);
    builder.write((+this.enableFalseScaling) + SocketMsg.NEWLINE);
    
    builder.write(FGMOptions.PARAM_SIM_PROPS + SocketMsg.NEWLINE);
    builder.write((+this._ignitionSize) + "|" + this._initialVertexCount.toFixed() + "|" + this.globalAssetOperation + "|" + this.assetCollisionCount + SocketMsg.NEWLINE);
  }
  
  /**
   * Streams the FGM options to a socket.
   * @param builder
   */
  public streamCopy(builder: net.Socket) {
    if (this._maxAccTS != null) {
      builder.write(FGMOptions.PARAM_MAXACCTS + SocketMsg.NEWLINE);
      builder.write(this._maxAccTS + SocketMsg.NEWLINE);
    }
    
    if (this._distRes != -1) {
      builder.write(FGMOptions.PARAM_DISTRES + SocketMsg.NEWLINE);
      builder.write(this._distRes + SocketMsg.NEWLINE);
    }
    
    if (this._perimRes != -1) {
      builder.write(FGMOptions.PARAM_PERIMRES + SocketMsg.NEWLINE);
      builder.write(this._perimRes + SocketMsg.NEWLINE);
    }
    
    if (this._minimumSpreadingROS != null) {
      builder.write(FGMOptions.PARAM_MINSPREADROS + SocketMsg.NEWLINE);
      builder.write(this._minimumSpreadingROS + SocketMsg.NEWLINE);
    }
    
    if (this.stopAtGridEnd != null) {
      builder.write(FGMOptions.PARAM_STOPGRIDEND + SocketMsg.NEWLINE);
      builder.write((+this.stopAtGridEnd) + SocketMsg.NEWLINE);
    }
    
    if (this.breaching != null) {
      builder.write(FGMOptions.PARAM_BREACHING + SocketMsg.NEWLINE);
      builder.write((+this.breaching) + SocketMsg.NEWLINE);
    }
    
    if (this.dynamicSpatialThreshold != null) {
      builder.write(FGMOptions.PARAM_DYNAMICTHRESHOLD + SocketMsg.NEWLINE);
      builder.write((+this.dynamicSpatialThreshold) + SocketMsg.NEWLINE);
    }
    
    if (this.spotting != null) {
      builder.write(FGMOptions.PARAM_SPOTTING + SocketMsg.NEWLINE);
      builder.write((+this.spotting) + SocketMsg.NEWLINE);
    }
    
    if (this.purgeNonDisplayable != null) {
      builder.write(FGMOptions.PARAM_PURGENONDISPLAY + SocketMsg.NEWLINE);
      builder.write((+this.purgeNonDisplayable) + SocketMsg.NEWLINE);
    }
    
    if (this._dx != null) {
      builder.write(FGMOptions.PARAM_DX + SocketMsg.NEWLINE);
      builder.write(this._dx + SocketMsg.NEWLINE);
    }
    
    if (this._dy != null) {
      builder.write(FGMOptions.PARAM_DY + SocketMsg.NEWLINE);
      builder.write(this._dy + SocketMsg.NEWLINE);
    }
    
    if (this._dt != null) {
      builder.write(FGMOptions.PARAM_DT + SocketMsg.NEWLINE);
      builder.write(this._dt + SocketMsg.NEWLINE);
    }
    
    if (this._dwd != null) {
      builder.write(FGMOptions.PARAM_DWD + SocketMsg.NEWLINE);
      builder.write(this._dwd + SocketMsg.NEWLINE);
    }
    
    if (this._owd != null) {
      builder.write(FGMOptions.PARAM_OWD + SocketMsg.NEWLINE);
      builder.write(this._owd + SocketMsg.NEWLINE);
    }
    
    if (this._dvd != null) {
      builder.write(FGMOptions.PARAM_DVD + SocketMsg.NEWLINE);
      builder.write(this._dvd + SocketMsg.NEWLINE);
    }
    
    if (this._ovd != null) {
      builder.write(FGMOptions.PARAM_OVD + SocketMsg.NEWLINE);
      builder.write(this._ovd + SocketMsg.NEWLINE);
    }
    
    if (this.growthPercentileApplied != null) {
      builder.write(FGMOptions.PARAM_GROWTHAPPLIED + SocketMsg.NEWLINE);
      builder.write((+this.growthPercentileApplied) + SocketMsg.NEWLINE);
    }
    
    if (this._growthPercentile != null) {
      builder.write(FGMOptions.PARAM_GROWTHPERC + SocketMsg.NEWLINE);
      builder.write(this._growthPercentile + SocketMsg.NEWLINE);
    }
    
    if (this.suppressTightConcave != null) {
      builder.write(FGMOptions.PARAM_SUPPRESS_TIGHT_CONCAVE + SocketMsg.NEWLINE);
      builder.write((+this.suppressTightConcave) + SocketMsg.NEWLINE);
    }
    
    if (this.nonFuelsAsVectorBreaks != null) {
      builder.write(FGMOptions.PARAM_NON_FUELS_AS_VECTOR_BREAKS + SocketMsg.NEWLINE);
      builder.write((+this.nonFuelsAsVectorBreaks) + SocketMsg.NEWLINE);
    }
    
    if (this.nonFuelsToVectorBreaks != null) {
      builder.write(FGMOptions.PARAM_NON_FUELS_TO_VECTOR_BREAKS + SocketMsg.NEWLINE);
      builder.write((+this.nonFuelsToVectorBreaks) + SocketMsg.NEWLINE);
    }
    
    if (this.useIndependentTimesteps != null) {
      builder.write(FGMOptions.PARAM_USE_INDEPENDENT_TIMESTEPS + SocketMsg.NEWLINE);
      builder.write((+this.useIndependentTimesteps) + SocketMsg.NEWLINE);
    }
    
    if (this._perimeterSpacing != null) {
      builder.write(FGMOptions.PARAM_PERIMETER_SPACING + SocketMsg.NEWLINE);
      builder.write(this._perimeterSpacing + SocketMsg.NEWLINE);
    }
    
    builder.write(FGMOptions.PARAM_SIM_PROPS + SocketMsg.NEWLINE);
    builder.write((+this._ignitionSize) + "|" + this._initialVertexCount.toFixed() + "|" + this.globalAssetOperation + "|" + this.assetCollisionCount + SocketMsg.NEWLINE);
    
    return "";
  }
}

/**
 * The fire behaviour prediction options.
 * @author "Travis Redpath"
 */
export class FBPOptions {
  public static readonly PARAM_TERRAIN = "terraineffect";
  public static readonly PARAM_WINDEFF = "windeffect";
  
  public static readonly DEFAULT_TERRAINEFF = "TERRAINEFFECT";
  public static readonly DEFAULT_WINDEFFECT = "fgmd_windeffect";
  
  /**
   * Use terrain effect (optional).
   * Has a default value.
   */
  public terrainEffect: boolean|null = null;
  /**
   * Use wind effect (optional).
   */
  public windEffect: boolean|null = null;
  
  /**
   * Checks to see if all of the required values have been set.
   */
  public isValid = (): boolean => {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may be in the FBP options.
   * @returns A list of the errors that were found.
   */
  public checkValid = (): Array<ValidationError> => {
    return new Array<ValidationError>();
  }
  
  public tryParse(type: string, data: string): boolean {
    if (type === FBPOptions.DEFAULT_TERRAINEFF) {
      this.terrainEffect = !!data;
      return true;
    }
    else if (type === FBPOptions.DEFAULT_WINDEFFECT) {
      this.windEffect = !!data;
      return true;
    }
    return false;
  }
  
  /**
   * Streams the FBP options to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    if (this.terrainEffect != null) {
      builder.write(FBPOptions.PARAM_TERRAIN + SocketMsg.NEWLINE);
      builder.write((+this.terrainEffect) + SocketMsg.NEWLINE);
    }
    
    if (this.windEffect != null) {
      builder.write(FBPOptions.PARAM_WINDEFF + SocketMsg.NEWLINE);
      builder.write((+this.windEffect) + SocketMsg.NEWLINE);
    }
  }
  
  /**
   * Streams the FBP options to a socket.
   * @param builder
   */
  public streamCopy(builder: net.Socket): void {
    if (this.terrainEffect != null) {
      builder.write(FBPOptions.PARAM_TERRAIN + SocketMsg.NEWLINE);
      builder.write((+this.terrainEffect) + SocketMsg.NEWLINE);
    }
    
    if (this.windEffect != null) {
      builder.write(FBPOptions.PARAM_WINDEFF + SocketMsg.NEWLINE);
      builder.write((+this.windEffect) + SocketMsg.NEWLINE);
    }
  }
}

/**
 * The foliar moisture content options.
 * @author "Travis Redpath"
 */
export class FMCOptions {
  public static readonly PARAM_PEROVER = "peroverride";
  public static readonly PARAM_NODATAELEV = "nodataelev";
  public static readonly PARAM_TERRAIN = "fmc_terrain";
  
  public static readonly DEFAULT_PEROVER = "PEROVERRIDEVAL";
  public static readonly DEFAULT_NODATAELEV = "NODATAELEV";
  public static readonly DEFAULT_TERRAIN = "fmcd_terrain";
  public static readonly DEFAULT_ACCURATELOCATION = "fmcd_accuratelocation";
  
  /**
   * The value for the FMC (%) override (optional). Must be between 0 and 300.
   * Has a default value.
   */
  private _perOverride: number = -1;
  /**
   * Get the value for the FMC (%) override.
   */
  get perOverride(): number {
    return this._perOverride;
  }
  /**
   * Set the percent override. Must be between in [0, 300]. Can also be -1 to indicate that the value shouldn't be used.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set perOverride(value: number) {
    if (SocketMsg.inlineThrowOnError && (value == null || (value < 0 && value != -1) || value > 300)) {
      throw new RangeError("The percent override is not valid.");
    }
    this._perOverride = value;
  }
  /**
   * The elevation where NODATA or no grid exists (required). Must be between 0 and 7000.
   * Has a default value.
   */
  private _nodataElev: number = -99;
  /**
   * Get the elevation to use where NODATA or no grid exists.
   */
  get nodataElev(): number {
    return this._nodataElev;
  }
  /**
   * Set the elevation to use where NODATA or no grid exists, in metres. Must be between in [0, 7000]. Can also be -99 or -1 to indicate that the value shouldn't be used.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set nodataElev(value: number) {
    if (SocketMsg.inlineThrowOnError && (value == null || (value < 0 && value != -1 && value != -99) || value > 7000)) {
      throw new RangeError("The ignition size is not valid.");
    }
    this._nodataElev = value;
  }
  /**
   * Optional.
   * Has a default value.
   */
  public terrain: boolean|null = null;
  /**
   * Optional.
   * Has a default value.
   * @deprecated deprecated. Always true.
   */
  public accurateLocation: boolean|null = null;
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the FMC options.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this._nodataElev == null) {
      errs.push(new ValidationError("nodataElev", "The elevation to use where NODATA exists was not set.", this));
    }
    else if ((this._nodataElev < 0 && this._nodataElev != -9999 && this._nodataElev != -1 && this._nodataElev != -99) || this._nodataElev > 7000) {
      errs.push(new ValidationError("nodataElev", "The elevation to use where NODATA exists is invalid.", this));
    }
    if(this._perOverride != null && this._perOverride != -1) {
      if(this._perOverride < 0.0 || this._perOverride > 300.0) {
        errs.push(new ValidationError("perOverride", "The FMC percent override was set but is invalid.", this));
      }
    }
    return errs;
  }
  
  public tryParse(type: string, data: string): boolean {
    if (type === FMCOptions.DEFAULT_PEROVER) {
      this._perOverride = parseFloat(data);
      return true;
    }
    else if (type === FMCOptions.DEFAULT_NODATAELEV) {
      this._nodataElev = parseFloat(data);
      return true;
    }
    else if (type === FMCOptions.DEFAULT_TERRAIN) {
      this.terrain = !!data;
      return true;
    }
    else if (type === FMCOptions.DEFAULT_ACCURATELOCATION) {
      this.accurateLocation = !!data;
      return true;
    }
    return false;
  }
  
  /**
   * Streams the FMC options to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    if (this._perOverride != null && this._perOverride >= 0) {
      builder.write(FMCOptions.PARAM_PEROVER + SocketMsg.NEWLINE);
      builder.write(this._perOverride + SocketMsg.NEWLINE);
    }
    
    builder.write(FMCOptions.PARAM_NODATAELEV + SocketMsg.NEWLINE);
    builder.write(this._nodataElev + SocketMsg.NEWLINE);
    
    if (this.terrain != null) {
      builder.write(FMCOptions.PARAM_TERRAIN + SocketMsg.NEWLINE);
      builder.write((+this.terrain) + SocketMsg.NEWLINE);
    }
  }
  
  /**
   * Streams the FMC options to a socket.
   * @param builder
   */
  public streamCopy(builder: net.Socket): void {
    if (this._perOverride != null && this._perOverride >= 0) {
      builder.write(FMCOptions.PARAM_PEROVER + SocketMsg.NEWLINE);
      builder.write(this.perOverride + SocketMsg.NEWLINE);
    }
    
    if (this._nodataElev != null && this._nodataElev != -9999) {
      builder.write(FMCOptions.PARAM_NODATAELEV + SocketMsg.NEWLINE);
      builder.write(this._nodataElev + SocketMsg.NEWLINE);
    }
    
    if (this.terrain != null) {
      builder.write(FMCOptions.PARAM_TERRAIN + SocketMsg.NEWLINE);
      builder.write((+this.terrain) + SocketMsg.NEWLINE);
    }
  }
}

/**
 * The fire weather index options.
 * @author "Travis Redpath"
 */
export class FWIOptions {
  public static readonly PARAM_FWISPACIAL = "fwispacinterp";
  public static readonly PARAM_FWIFROMSPACIAL = "fwifromspacweather";
  public static readonly PARAM_HISTORYFWI = "historyonfwi";
  public static readonly PARAM_BURNINGCONDON = "burningconditionon";
  public static readonly PARAM_FWITEMPORALINTERP = "fwitemporalinterp";
  
  public static readonly DEFAULT_FWISPACINTERP = "FWISPACINTERP";
  public static readonly DEFAULT_FWIFROMSPACWEATH = "FWIFROMSPACWEATH";
  public static readonly DEFAULT_HISTORYONFWI = "HISTORYONFWI";
  public static readonly DEFAULT_BURNINGCONDITIONSON = "fwid_burnconditions";
  public static readonly DEFAULT_TEMPORALINTERP = "fwid_tempinterp";
  
  /**
   * Apply spatial interpolation to FWI values (optional).
   * Has a default value.
   */
  public fwiSpacInterp: boolean|null = null;
  /**
   * Calculate FWI values from temporally interpolated weather (optional).
   * Has a default value.
   */
  public fwiFromSpacWeather: boolean|null = null;
  /**
   * Apply history to FWI values affected by patches, grids, etc. (optional).
   * Has a default value.
   */
  public historyOnEffectedFWI: boolean|null = null;
  /**
   * Use burning conditions (optional).
   */
  public burningConditionsOn: boolean|null = null;
  /**
   * Apply spatial interpolation to FWI values (optional).
   */
  public fwiTemporalInterp: boolean|null = null;
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the FWI options.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    return new Array<ValidationError>();
  }
  
  public tryParse(type: string, data: string): boolean {
    if (type === FWIOptions.DEFAULT_FWISPACINTERP) {
      this.fwiSpacInterp = !!data;
      return true;
    }
    else if (type === FWIOptions.DEFAULT_FWIFROMSPACWEATH) {
      this.fwiFromSpacWeather = !!data;
      return true;
    }
    else if (type === FWIOptions.DEFAULT_HISTORYONFWI) {
      this.historyOnEffectedFWI = !!data;
      return true;
    }
    else if (type === FWIOptions.DEFAULT_BURNINGCONDITIONSON) {
      this.burningConditionsOn = !!data;
      return true;
    }
    else if (type === FWIOptions.DEFAULT_TEMPORALINTERP) {
      this.fwiTemporalInterp = !!data;
      return true;
    }
    return false;
  }
  
  /**
   * Streams the FWI options to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    if (this.fwiSpacInterp != null) {
      builder.write(FWIOptions.PARAM_FWISPACIAL + SocketMsg.NEWLINE);
      builder.write((+this.fwiSpacInterp) + SocketMsg.NEWLINE);
    }
    
    if (this.fwiFromSpacWeather != null) {
      builder.write(FWIOptions.PARAM_FWIFROMSPACIAL + SocketMsg.NEWLINE);
      builder.write((+this.fwiFromSpacWeather) + SocketMsg.NEWLINE);
    }
    
    if (this.historyOnEffectedFWI != null) {
      builder.write(FWIOptions.PARAM_HISTORYFWI + SocketMsg.NEWLINE);
      builder.write((+this.historyOnEffectedFWI) + SocketMsg.NEWLINE);
    }
    
    if (this.burningConditionsOn != null) {
      builder.write(FWIOptions.PARAM_BURNINGCONDON + SocketMsg.NEWLINE);
      builder.write((+this.burningConditionsOn) + SocketMsg.NEWLINE);
    }
    
    if (this.fwiTemporalInterp != null) {
      builder.write(FWIOptions.PARAM_FWITEMPORALINTERP + SocketMsg.NEWLINE);
      builder.write((+this.fwiTemporalInterp) + SocketMsg.NEWLINE);
    }
  }
}

/**
 * Possible metadata that could be written to vector files.
 * @author "Travis Redpath"
 */
export class VectorMetadata {
  public static readonly DEFAULT_VERSION = "VERSION";
  public static readonly DEFAULT_SCENNAME = "SCENNAME";
  public static readonly DEFAULT_JOBNAME = "JOBNAME";
  public static readonly DEFAULT_IGNAME = "IGNAME";
  public static readonly DEFAULT_SIMDATE = "SIMDATE";
  public static readonly DEFAULT_FIRESIZE = "FIRESIZE";
  public static readonly DEFAULT_PERIMTOTAL = "PERIMTOTAL";
  public static readonly DEFAULT_PERIMACTIVE = "PERIMACTIVE";
  public static readonly DEFAULT_AREAUNIT = "AREAUNIT";
  public static readonly DEFAULT_PERIMUNIT = "PERIMUNIT";
  
  /**
   * W.I.S.E. version and build date (required).
   * Has a default value.
   */
  public version: boolean|null = null;
  /**
   * Scenario name (required).
   * Has a default value.
   */
  public scenName: boolean|null = null;
  /**
   * Job name (required).
   * Has a default value.
   */
  public jobName: boolean|null = null;
  /**
   * Ignition name(s) (required).
   * Has a default value.
   */
  public igName: boolean|null = null;
  /**
   * Simulated date/time (required).
   * Has a default value.
   */
  public simDate: boolean|null = null;
  /**
   * Fire size (area) (required).
   * Has a default value.
   */
  public fireSize: boolean|null = null;
  /**
   * Total perimeter (required).
   * Has a default value.
   */
  public perimTotal: boolean|null = null;
  /**
   * Active perimeter (required).
   * Has a default value.
   */
  public perimActive: boolean|null = null;
  /**
   * Units of measure for area outputs (required). Must be one of the area values defined in the UNITS class.
   * Has a default value.
   * @deprecated Use the global unit settings instead. Will be removed in the future.
   */
  public areaUnit: Units = Units.UNKNOWN;
  /**
   * Units of measure for perimeter outputs (required). Must be one of the distance values defined in the UNITS class.
   * Has a default value.
   * @deprecated Use the global unit settings instead. Will be removed in the future.
   */
  public perimUnit: Units = Units.UNKNOWN;
  /**
   * Include the weather information in the output vector file (optional).
   */
  public wxValues: boolean|null = null;
  /**
   * Include the FWI values in the output vector file (optional).
   */
  public fwiValues: boolean|null = null;
  /**
   * Include the location of the ignition that created the perimeter in the vector file (optional).
   */
  public ignitionLocation: boolean|null = null;
  /**
   * Add the max burn distance for each perimeter to the vector file (optional).
   */
  public maxBurnDistance: boolean|null = null;
  /**
   * Pass ignition attributes from the input ignition file to the output perimeter (optional).
   */
  public ignitionAttributes: boolean|null = null;
  /**
   * The time that the fire front reached an asset and the simulation stopped (optional).
   */
  public assetArrivalTime: boolean|null = null;
  /**
   * The number of assets that were reached when the simulation stopped, if any (optional).
   */
  public assetArrivalCount: boolean|null = null;
  /**
   * Add a column of 0s and 1s to indicate if a perimeter is the final perimeter of a simulation
   * or an intermediate step.
   */
  public identifyFinalPerimeter: boolean|null = null;
  /**
   * Simulation status when the end condition has been reached. Needed to know the reason the
   * simulation ended when using stop conditions or assets.
   */
  public simStatus: boolean|null = null;
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this.version == null) {
      errs.push(new ValidationError("version", "Whether the W.I.S.E. version metadata should be exported or not has not been set.", this));
    }
    if (this.scenName == null) {
      errs.push(new ValidationError("scenName", "Whether the scenario name metadata should be exported or not has not been set.", this));
    }
    if (this.jobName == null) {
      errs.push(new ValidationError("jobName", "Whether the job name metadata should be exported or not has not been set.", this));
    }
    if (this.igName == null) {
      errs.push(new ValidationError("igName", "Whether the ignition name metadata should be exported or not has not been set.", this));
    }
    if (this.simDate == null) {
      errs.push(new ValidationError("simDate", "Whether the simulation date metadata should be exported or not has not been set.", this));
    }
    if (this.fireSize == null) {
      errs.push(new ValidationError("fireSize", "Whether the fire area metadata should be exported or not has not been set.", this));
    }
    if (this.perimTotal == null) {
      errs.push(new ValidationError("perimTotal", "Whether the total perimeter size metadata should be exported or not has not been set.", this));
    }
    if (this.perimActive == null) {
      errs.push(new ValidationError("perimActive", "Whether the active perimeter size metadata should be exported or not has not been set.", this));
    }
    if (this.areaUnit != Units.FT2 && this.areaUnit != Units.KM2 && this.areaUnit != Units.M2 && this.areaUnit != Units.MI2 &&
        this.areaUnit != Units.HA && this.areaUnit != Units.YD2 && this.areaUnit != Units.ACRE) {
      errs.push(new ValidationError("areaUnit", "Invalid unit for area metadata.", this));
    }
    if (this.perimUnit != Units.FT && this.perimUnit != Units.KM && this.perimUnit != Units.M && this.perimUnit != Units.MI &&
        this.perimUnit != Units.YARD && this.perimUnit != Units.CHAIN) {
      errs.push(new ValidationError("perimUnit", "Invalid unit for perimeter size metadata.", this));
    }
    return errs;
  }
  
  public tryParse(type: string, data: string): boolean {
    if (type === VectorMetadata.DEFAULT_VERSION) {
      this.version = !!data;
      return true;
    }
    else if (type === VectorMetadata.DEFAULT_SCENNAME) {
      this.scenName = !!data;
      return true;
    }
    else if (type === VectorMetadata.DEFAULT_JOBNAME) {
      this.jobName = !!data;
      return true;
    }
    else if (type === VectorMetadata.DEFAULT_IGNAME) {
      this.igName = !!data;
      return true;
    }
    else if (type === VectorMetadata.DEFAULT_SIMDATE) {
      this.simDate = !!data;
      return true;
    }
    else if (type === VectorMetadata.DEFAULT_FIRESIZE) {
      this.fireSize = !!data;
      return true;
    }
    else if (type === VectorMetadata.DEFAULT_PERIMTOTAL) {
      this.perimTotal = !!data;
      return true;
    }
    else if (type === VectorMetadata.DEFAULT_PERIMACTIVE) {
      this.perimActive = !!data;
      return true;
    }
    else if (type === VectorMetadata.DEFAULT_AREAUNIT) {
      this.areaUnit = parseInt(data);
      return true;
    }
    else if (type === VectorMetadata.DEFAULT_PERIMUNIT) {
      this.perimUnit = parseInt(data);
      return true;
    }
    return false;
  }
}

export enum WISELogLevel {
  VERBOSE = 1,
  DEBUG = 2,
  INFO = 3,
  WARN = 4,
  NONE = 5
}

export class WISELogger {
  private static instance: WISELogger|null = null;
  private level: WISELogLevel = WISELogLevel.WARN;
  
  private constructor() { }
  
  public static getInstance(): WISELogger {
    if (WISELogger.instance == null) {
      WISELogger.instance = new WISELogger();
    }
    return WISELogger.instance;
  }
  
  public setLogLevel(level: WISELogLevel) {
    this.level = level;
  }
  
  /*
   * Sets the log level back to the default, WARN
   */
  public unsetLogLevel() {
    this.level = WISELogLevel.WARN;;
  }
  
  public error(message: string) {
    if (this.level <= WISELogLevel.VERBOSE) {
      console.log("[verbose] " + new Date().toISOString() + " . " + message);
    }
  }
  
  public debug(message: string) {
    if (this.level <= WISELogLevel.DEBUG) {
      console.log("[debug]   " + new Date().toISOString() + " . " + message);
    }
  }
  
  public info(message: string) {
    if (this.level <= WISELogLevel.INFO) {
      console.log("[info]    " + new Date().toISOString() + " . " + message);
    }
  }
  
  public warn(message: string) {
    if (this.level <= WISELogLevel.WARN) {
      console.log("[warn]    " + new Date().toISOString() + " . " + message);
    }
  }
}

/**
 * Which summary values to output.
 * @author "Travis Redpath"
 */
export class SummaryOutputs {
  private static readonly DEFAULT_TIMETOEXEC = "TIMETOEXEC";
  private static readonly DEFAULT_GRIDINFO = "GRIDINFO";
  private static readonly DEFAULT_LOCATION = "LOCATION";
  private static readonly DEFAULT_ELEVINFO = "ELEVINFO";
  private static readonly DEFAULT_INPUTSUM = "INPUTSUMMARY";
  
  /**
   * Application information (optional).
   * Has a default value.
   */
  public outputApplication: boolean|null = null;
  /**
   * Grid information (cell size, dimensions) (optional).
   * Has a default value.
   */
  public outputGeoData: boolean|null = null;
  /**
   * Scenario Information (optional).
   * Has a default value.
   */
  public outputScenario: boolean|null = null;
  /**
   * Scenario comments (optional).
   * Has a default value.
   */
  public outputScenarioComments: boolean|null = null;
  /**
   * Inputs (optional).
   * Has a default value.
   */
  public outputInputs: boolean|null = null;
  /**
   * Landscape information (optional).
   */
  public outputLandscape: boolean|null = null;
  /**
   * Fuel patch information (optional).
   */
  public outputFBPPatches: boolean|null = null;
  /**
   * Wx patches and grids information (optional).
   */
  public outputWxPatches: boolean|null = null;
  /**
   * Ignition information (optional).
   */
  public outputIgnitions: boolean|null = null;
  /**
   * Wx stream information (optional).
   */
  public outputWxStreams: boolean|null = null;
  /**
   * Fuel type information (optional).
   */
  public outputFBP: boolean|null = null;
  /**
   * Wx stream data (temperature, RH, etc.) (optional).
   */
  public outputWxData: boolean|null = null;
  /**
   * Asset related information (asset file reference) (optional).
   */
  public outputAssetInfo: boolean|null = null;
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the summary output settings.
   * @returns A list of all errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    return [];
  }
  
  public tryParse(type: string, data: string): boolean {
    //TODO parse
    return false;
  }
}

/**
 * All supported statistics values that can be used across the API.
 * Not all locations will support all statistics.
 */
export enum GlobalStatistics {
  DATE_TIME = 0,
  ELAPSED_TIME = 1,
  TIME_STEP_DURATION = 2,
  TEMPERATURE = 3,
  DEW_POINT = 4,
  RELATIVE_HUMIDITY = 5,
  WIND_SPEED = 6,
  WIND_DIRECTION = 7,
  PRECIPITATION = 8,
  HFFMC = 9,
  HISI = 10,
  DMC = 11,
  DC = 12,
  HFWI = 13,
  BUI = 14,
  FFMC = 15,
  ISI = 16,
  FWI = 17,
  TIMESTEP_AREA = 18,
  TIMESTEP_BURN_AREA = 19,
  TOTAL_AREA = 20,
  /**
   * Total area of the fire. (sq. metres)
   */
  TOTAL_BURN_AREA = 21,
  /**
   * Rate of change in the fire area. (sq. metres)
   */
  AREA_GROWTH_RATE = 22,
  /**
   * Total exterior fire perimeter, including active and inactive portions. (metres)
   */
  EXTERIOR_PERIMETER = 23,
  /**
   * Rate of change in the exterior perimeter growth rate. (metres per minute)
   */
  EXTERIOR_PERIMETER_GROWTH_RATE = 24,
  /**
   * Portion of the fire front considered active (interior and exterior) (where 1 or both vertices are active). (metres)
   */
  ACTIVE_PERIMETER = 25,
  /**
   * Rate of change in the active perimeter growth rate. (metres per minute)
   */
  ACTIVE_PERIMETER_GROWTH_RATE = 26,
  /**
   * Total fire perimeter, including interior and exterior and active/inactive portions. (metres)
   */
  TOTAL_PERIMETER = 27,
  /**
   * Rate of change in the total perimeter growth rate. (metres per minute)
   */
  TOTAL_PERIMETER_GROWTH_RATE = 28,
  FI_LT_10 = 29,
  FI_10_500 = 30,
  FI_500_2000 = 31,
  FI_2000_4000 = 32,
  FI_4000_10000 = 33,
  FI_GT_10000 = 34,
  ROS_0_1 = 35,
  ROS_2_4 = 36,
  ROS_5_8 = 37,
  ROS_9_14 = 38,
  ROS_GT_15 = 39,
  /**
   * Maximum rate of spread calculated from Dr. Richards' ellipse equations (metres per minute).
   */
  MAX_ROS = 40,
  MAX_FI = 41,
  /**
   * Maximum flame length (metres), based on ROS from Dr. Richards' ellipse equations.
   */
  MAX_FL = 42,
  /**
   * Maximum crown fraction burned (unitless), based on ROS from Dr. Richards' ellipse equations.
   */
  MAX_CFB = 43,
  /**
   * Maximum crown fuel consumption (kg/m2), based on ROS from Dr. Richards' ellipse equations.
   */
  MAX_CFC = 44,
  /**
   * Maximum surface fuel consumption (kg/m2), based on ROS from Dr. Richards' ellipse equations.
   */
  MAX_SFC = 45,
  /**
   * Maximum total fuel consumption (kg/m2), based on ROS from Dr. Richards' ellipse equations.
   */
  MAX_TFC = 46,
  TOTAL_FUEL_CONSUMED = 47,
  CROWN_FUEL_CONSUMED = 48,
  SURFACE_FUEL_CONSUMED = 49,
  /**
   * Number of active vertices defining the fire perimeter(s).
   */
  NUM_ACTIVE_VERTICES = 50,
  /**
   * Number of vertices defining the fire perimeter(s).
   */
  NUM_VERTICES = 51,
  /**
   * Total, cumulative number of verticies defining the simulation's perimeters.
   */
  CUMULATIVE_VERTICES = 52,
  /**
   * Cumulative number of active vertices defining the fire perimeter(s).
   */
  CUMULATIVE_ACTIVE_VERTICES = 53,
  /**
   * Number of fire fronts (interior and exterior) which have at least 1 active vertex.
   */
  NUM_ACTIVE_FRONTS = 54,
  /**
   * Number of fire fronts (interior and exterior).
   */
  NUM_FRONTS = 55,
  MEMORY_USED_START = 56,
  MEMORY_USED_END = 57,
  NUM_TIMESTEPS = 58,
  NUM_DISPLAY_TIMESTEPS = 59,
  NUM_EVENT_TIMESTEPS = 60,
  NUM_CALC_TIMESTEPS = 61,
  /**
   * Number of real-time (clock) seconds to calculate the current display time step.
   */
  TICKS = 62,
  /**
   * Number of real-time (clock) seconds to calculate all display time steps.
   */
  PROCESSING_TIME = 63,
  /**
   * Number of simulated seconds that burning was allowed since the start of the simulation.
   */
  GROWTH_TIME = 64,
  RAZ = 65,
  BURN_GRID = 66,
  FIRE_ARRIVAL_TIME = 67,
  FIRE_ARRIVAL_TIME_MIN = 68,
  FIRE_ARRIVAL_TIME_MAX = 69,
  HROS = 70,
  FROS = 71,
  BROS = 72,
  RSS = 73,
  RADIATIVE_POWER = 74,
  /**
   * Maximum fire intensity, based on ROS the standard FBP equations.
   */
  HFI = 75,
  /**
   * Maximum crown fraction burned (unitless), based on ROS from standard FBP equations.
   */
  HCFB = 76,
  /**
   * The current simulation time as of the end of the timestep.
   */
  CURRENT_TIME = 77,
  /**
   * The name of the scenario that is reporting statistics.
   */
  SCENARIO_NAME = 78,
  BURN_PERCENTAGE = 79,
  /**
   * Change in the total perimeter growth. (metres)
   */
  TOTAL_PERIMETER_CHANGE = 80,
  /**
   * Change in the exterior perimeter growth. (metres)
   */
  EXTERIOR_PERIMETER_CHANGE = 81,
  /**
   * Change in the active perimeter growth. (metres)
   */
  ACTIVE_PERIMETER_CHANGE = 82,
  /**
   * Change in fire area. (sq. metres)
   */
  AREA_CHANGE = 83,
  BURN = 84,
  HROS_MAP = 85,
  FROS_MAP = 86,
  BROS_MAP = 87,
  RSS_MAP = 88,
  RAZ_MAP = 89,
  FMC_MAP = 90,
  CFB_MAP = 91,
  CFC_MAP = 92,
  SFC_MAP = 93,
  TFC_MAP = 94,
  FI_MAP = 95,
  FL_MAP = 96,
  CURINGDEGREE_MAP = 97,
  GREENUP_MAP = 98,
  PC_MAP = 99,
  PDF_MAP = 100,
  CBH_MAP = 101,
  TREE_HEIGHT_MAP = 102,
  FUEL_LOAD_MAP = 103,
  CFL_MAP = 104,
  GRASSPHENOLOGY_MAP = 105,
  ROSVECTOR_MAP = 106,
  DIRVECTOR_MAP = 107,
  CRITICAL_PATH = 108,
  CRITICAL_PATH_PERCENTAGE = 109
}

export class ValidationError {
  /**
   * The name of the property that was invalid or the index of the invalid
   * object if for an array.
   */
  public propertyName: string|number;
  
  /**
   * A message about the invalid property.
   */
  public message: string;
  
  /**
   * The object for this level of the validation check.
   */
  public object: any;
  
  public children = new Array<ValidationError>();
  
  public constructor(propertyName: string|number, message: string, object: any) {
    this.propertyName = propertyName;
    this.message = message;
    this.object = object;
  }
  
  public addChild(child: ValidationError) {
    this.children.push(child);
  }
  
  public getValue(): any {
    if (this.propertyName == null) {
      return this;
    }
    return this.object[this.propertyName];
  }
}
