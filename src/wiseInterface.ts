/**
 * Classes needed to build and run a W.I.S.E. job.
 * Jobs built with the classes in this module
 * will be serialized and streamed to W.I.S.E.
 * Builder for it to construct the necessary
 * files to run W.I.S.E..
 * 
 * For an example see index.js.
 */

/** ignore this comment */
import * as fs from "fs";
import { DateTime } from "luxon";
import * as net from "net";
import { FuelDefinition } from "./fuels";
import { SocketMsg, LatLon, Duration, FGMOptions, FBPOptions, FMCOptions, FWIOptions, Timezone, VectorMetadata, SummaryOutputs, SocketHelper, WISELogger, IWISESerializable, AssetOperation, GlobalStatistics, ValidationError, TimeRange } from "./wiseGlobals";


export class VersionInfo {
  public static readonly version_info: string = /*vers*/'2022.12.00'/*/vers*/;
  
  public static readonly release_date: string = /*rld*/'December 8, 2022'/*/rld*/;
  
  /**
   * @ignore
   */
  public static localVersion(version: string): string {
    return version;
  }
}

export enum GridFileType {
  NONE = -1,
  FUEL_GRID = 0,
  DEGREE_CURING = 1,
  GREEN_UP = 2,
  PERCENT_CONIFER = 3,
  PERCENT_DEAD_FIR = 4,
  CROWN_BASE_HEIGHT = 5,
  TREE_HEIGHT = 6,
  FUEL_LOAD = 7,
  FBP_VECTOR = 8
}

/**
 * Information about a grid input file.
 * @author "Travis Redpath"
 */
export class GridFile {
  private static readonly PARAM_GRID_FILE = "inputgridfile";
  
  protected static counter = 0;
  
  /**
   * The name of the grid file. Must be unique amongst the grid file collection.
   */
  private _id: string;
  /**
   * Get the name of the grid file.
   */
  get id(): string {
    return this._id;
  }
  /**
   * Set the name of the grid file. Must be unique amongst the grid file collection. Cannot be null or empty.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set id(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The name of the grid file is not valid");
    }
    this.setName(value);
  }
  /**
   * Comment about the grid file (optional).
   */
  private _comment: string = "";
  /**
   * Get the comment about the grid file.
   */
  get comment(): string {
    return this._comment;
  }
  /**
   * Set the comment about the grid file.
   */
  set comment(value: string) {
    if (value == null) {
      this._comment = "";
    }
    else {
      this._comment = value;
    }
  }
  /**
   * The type of grid file (required).
   */
  public type: GridFileType = GridFileType.NONE;
  /**
   * The location of the file containing the grid data (required).
   */
  private _filename: string = "";
  /**
   * Get the location of the file containing the grid data.
   */
  get filename(): string {
    return this._filename;
  }
  /**
   * Set the location of the file containing the grid data. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set filename(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The grid file does not exist.");
    }
    this._filename = value;
  }
  /**
   * The projection file for the grid file (required).
   */
  private _projection: string = "";
  /**
   * Get the location of the projection file for the grid file.
   */
  get projection(): string {
    return this._projection;
  }
  /**
   * Set the location of the projection file for the grid file. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set projection(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The grid file projection does not exist.");
    }
    this._projection = value;
  }
  
  public constructor() {
    this._id = "grdfl" + GridFile.counter;
    GridFile.counter += 1;
  }
  
  public getId(): string {
    return this._id;
  }
  
  /**
   * Set the name of the grid file. This name must be unique within
   * the simulation. The name will get a default value when the
   * grid file is constructed but can be overriden with this method.
   */
  public setName(name: string): void {
    this._id = name.replace(/\|/g, "");
  }
  
  /**
   * Are all required values set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may be in the grid file.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    if (!this._id || this._id.length === 0) {
      errs.push(new ValidationError("id", "No ID has been set for the grid file.", this));
    }
    if (this.type < GridFileType.FUEL_GRID && this.type > GridFileType.TREE_HEIGHT) {
      errs.push(new ValidationError("type", "An invalid type has been set on the grid file.", this));
    }
    if (!SocketMsg.skipFileTests) {
      //the filename must be either an attachment or a local file
      if (!this._filename.startsWith("attachment:/") && !fs.existsSync(this._filename)) {
        errs.push(new ValidationError("filename", "The grid file file does not exist.", this));
      }
      //the projection must be either an attachment or a local file
      if (!this._projection.startsWith("attachment:/") && !fs.existsSync(this._projection)) {
        errs.push(new ValidationError("projection", "The grid file projection does not exist.", this));
      }
    }
    return errs;
  }
  
  /**
   * Streams the grid file to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    let tmp = this._id + '|' + this._comment + '|' + this.type + '|' + this._filename + '|' + this._projection;
    builder.write(GridFile.PARAM_GRID_FILE + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

export enum WeatherPatchOperation {
  EQUAL = 0,
  PLUS = 1,
  MINUS = 2,
  MULTIPLY = 3,
  DIVIDE = 4
}

export enum WeatherPatchType {
  FILE = 0,
  POLYGON = 2,
  LANDSCAPE = 4
}

export class WeatherPatchDetails {
  /**
   * The operation that the patch applies (required).
   */
  public operation: WeatherPatchOperation;
  /**
   * The value to apply with this operation.
   */
  private _value: number;
  /**
   * Get the value to apply with this operation.
   */
  get value(): number {
    return this._value;
  }
  /**
   * Set the value to apply with this operation. Must be greater than 0.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set value(v: number) {
    if (SocketMsg.inlineThrowOnError && v <= 0) {
      throw new RangeError("The value is not valid.");
    }
    this._value = v;
  }
  
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    if (this.operation < 0 || this.operation > WeatherPatchOperation.DIVIDE) {
      errs.push(new ValidationError("operation", "An invalid operation has been set on the weather patch details.", this));
    }
    if (this._value <= 0) {
      errs.push(new ValidationError("value", "An invalid value has been set on the weather patch details.", this));
    }
    return errs;
  }
}

export class WeatherPatch_Temperature extends WeatherPatchDetails {
}

export class WeatherPatch_RelativeHumidity extends WeatherPatchDetails {
  
  /**
   * Helper function for setting the RH value as a percent [0-100].
   * @param value The value to apply (as a percent [0-100]).
   */
  public setValuePercent(value: number): void {
    this.value = value / 100.0;
  }
  
  /**
   * Helper function for unsetting the RH value.
   */
  public unsetValuePercent(): void {
    this.value = 0.0;
  }
}

export class WeatherPatch_Precipitation extends WeatherPatchDetails {
}

export class WeatherPatch_WindSpeed extends WeatherPatchDetails {
}

export class WeatherPatch_WindDirection extends WeatherPatchDetails {
  
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    if (this.operation < 0 || this.operation > WeatherPatchOperation.MINUS) {
      errs.push(new ValidationError("operation", "An invalid operation has been set on the wind direction weather patch details.", this));
    }
    if (this.value <= 0) {
      errs.push(new ValidationError("value", "An invalid value has been set on the weather patch details.", this));
    }
    return errs;
  }
}

/**
 * Information about a weather patch input file.
 * @author "Travis Redpath"
 */
export class WeatherPatch {
  private static readonly PARAM_WEATHER_PATCH = "weatherpatch";
  
  protected static counter = 0;
  
  /**
   * The name of the weather patch. The name must be unique amongst the weather patch collection.
   */
  private _id: string;
  /**
   * Get the name of the weather patch.
   */
  get id(): string {
    return this._id;
  }
  /**
   * Set the name of the weather patch. Must be unique amongst the weather patch collection. Cannot be null or empty.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set id(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The name of the weather patch is not valid");
    }
    this.setName(value);
  }
  /**
   * The patch start time (required).
   */
  private _startTime: DateTime;
  /**
   * Get the weather patch start time as a Luxon DateTime.
   */
  get lStartTime(): DateTime {
    return this._startTime;
  }
  /**
   * Get the weather patch start time as an ISO8601 string.
   * @deprecated
   */
  get startTime(): string {
    return this._startTime == null ? "" : this._startTime.toISO();
  }
  /**
   * Set the weather patch start time using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lStartTime(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The weather patch start time is not valid");
    }
    this._startTime = value;
  }
  /**
   * Set the weather patch start time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set startTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The weather patch start time is not valid");
    }
    this._startTime = DateTime.fromISO(value);
  }
  /**
   * The patch end time (required).
   */
  private _endTime: DateTime;
  /**
   * Get the weather patch end time as a Luxon DateTime.
   */
  get lEndTime(): DateTime {
    return this._endTime;
  }
  /**
   * Get the weather patch end time as an ISO8601 string.
   * @deprecated
   */
  get endTime(): string {
    return this._endTime == null ? "" : this._endTime.toISO();
  }
  /**
   * Set the weather patch end time using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lEndTime(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The weather patch end time is not valid");
    }
    this._endTime = value;
  }
  /**
   * Set the weather patch end time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set endTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The weather patch end time is not valid");
    }
    this._endTime = DateTime.fromISO(value);
  }
  /**
   * The patches start time of day (required).
   */
  private _startTimeOfDay: Duration;
  /**
   * Get the weather patch start time of day as a Duration.
   */
  get dStartTimeOfDay(): Duration {
    return this._startTimeOfDay;
  }
  /**
   * Get the weather patch start time of day as an ISO8601 string.
   * @deprecated
   */
  get startTimeOfDay(): string {
    return this._startTimeOfDay == null ? "" : this._startTimeOfDay.toString();
  }
  /**
   * Set the weather patch start time of day using a Duration. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set dStartTimeOfDay(value: Duration) {
    if (SocketMsg.inlineThrowOnError && (value == null || !value.isValid())) {
      throw new RangeError("The weather patch start time of dayis not valid");
    }
    this._startTimeOfDay = value;
  }
  /**
   * Set the weather patch start time of day using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set startTimeOfDay(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The weather patch start time of day is not valid");
    }
    this._startTimeOfDay = new Duration();
    this._startTimeOfDay.fromString(value);
  }
  /**
   * The patches end time of day (required). Must be formatted as "hh:mm:ss".
   */
  private _endTimeOfDay: Duration;
  /**
   * Get the weather patch end time of day as a Duration.
   */
  get dEndTimeOfDay(): Duration {
    return this._endTimeOfDay;
  }
  /**
   * Get the weather patch end time of day as an ISO8601 string.
   * @deprecated
   */
  get endTimeOfDay(): string {
    return this._endTimeOfDay == null ? "" : this._endTimeOfDay.toString();
  }
  /**
   * Set the weather patch end time of day using a Duration. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set dEndTimeOfDay(value: Duration) {
    if (SocketMsg.inlineThrowOnError && (value == null || !value.isValid())) {
      throw new RangeError("The weather patch end time of dayis not valid");
    }
    this._endTimeOfDay = value;
  }
  /**
   * Set the weather patch end time of day using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set endTimeOfDay(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The weather patch end time of day is not valid");
    }
    this._endTimeOfDay = new Duration();
    this._endTimeOfDay.fromString(value);
  }
  /**
   * Any user comments about the weather patch (optional).
   */
  public comments: string = "";
  /**
   * The type of weather patch (required).
   */
  public type: WeatherPatchType;
  /**
   * The filename associated with this weather patch. Only valid if type is FILE.
   */
  private _filename: string = "";
  /**
   * Get the location of the file containing the weather patch.
   */
  get filename(): string {
    return this._filename;
  }
  /**
   * Set the location of the file containing the weather patch. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set filename(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The grid file does not exist.");
    }
    this._filename = value;
  }
  /**
   * An array of LatLon describing the weather patch. Only valid if type is POLYGON.
   */
  public feature: Array<LatLon> = new Array<LatLon>();
  /**
   * The temperature to apply with this patch.
   */
  public temperature: WeatherPatch_Temperature|null = null;
  /**
   * The relative humidty to apply with this patch.
   */
  public rh: WeatherPatch_RelativeHumidity|null = null;
  /**
   * The precipitation to apply with this patch.
   */
  public precip: WeatherPatch_Precipitation|null = null;
  /**
   * The wind speed to apply with this patch.
   */
  public windSpeed: WeatherPatch_WindSpeed|null = null;
  /**
   * The wind direction to apply with this patch.
   */
  public windDirection: WeatherPatch_WindDirection|null = null;
  
  public getId(): string {
    return this._id;
  }
  
  /**
   * Set the name of the weather patch. This name must be unique within
   * the simulation. The name will get a default value when the
   * weather patch is constructed but can be overriden with this method.
   */
  public setName(name: string): void {
    this._id = name.replace(/\|/g, "");
  }
  
  public constructor() {
    this._id = "wthrptch" + WeatherPatch.counter;
    WeatherPatch.counter += 1;
  }
  
  /**
   * Set the temperature operation for the weather patch.
   * @param operation The operation to apply.
   * @param value The value to apply
   */
  public setTemperatureOperation(operation: WeatherPatchOperation, value: number) {
    this.temperature = new WeatherPatch_Temperature();
    this.temperature.value = value;
    this.temperature.operation = operation;
  }
  
  /**
   * Unset the temperature operation for the weather patch.
   */
  public unsetTemperatureOperation() {
    this.temperature = null;
  }
  
  /**
   * Set the relative humidity operation for the weather patch.
   * @param operation The operation to apply.
   * @param value The value to apply (as a percent [0-100]).
   */
  public setRhOperation(operation: WeatherPatchOperation, value: number) {
    this.rh = new WeatherPatch_RelativeHumidity();
    this.rh.value = value / 100.0;
    this.rh.operation = operation;
  }
  
  /**
   * Unset the relative humidty operation for the weather patch.
   */
  public unsetRhOperation() {
    this.rh = null;
  }
  
  /**
   * Set the precipitation operation for the weather patch.
   * @param operation The operation to apply.
   * @param value The value to apply
   */
  public setPrecipitationOperation(operation: WeatherPatchOperation, value: number) {
    this.precip = new WeatherPatch_Precipitation();
    this.precip.value = value;
    this.precip.operation = operation;
  }
  
  /**
   * Unset the precipitation operation for the weather patch.
   */
  public unsetPrecipitationOperation() {
    this.precip = null;
  }
  
  /**
   * Set the wind speed operation for the weather patch.
   * @param operation The operation to apply.
   * @param value The value to apply
   */
  public setWindSpeedOperation(operation: WeatherPatchOperation, value: number) {
    this.windSpeed = new WeatherPatch_WindSpeed();
    this.windSpeed.value = value;
    this.windSpeed.operation = operation;
  }
  
  /**
   * Unset the wind speed operation for the weather patch.
   */
  public unsetWindSpeedOperation() {
    this.windSpeed = null;
  }
  
  /**
   * Set the wind direction operation for the weather patch.
   * @param operation The operation to apply.
   * @param value The value to apply
   */
  public setWindDirOperation(operation: WeatherPatchOperation, value: number) {
    this.windDirection = new WeatherPatch_WindDirection();
    this.windDirection.value = value;
    this.windDirection.operation = operation;
  }
  
  /**
   * Unset the wind direction operation for the weather patch.
   */
  public unsetWindDirOperation() {
    this.windDirection = null;
  }
  
  /**
   * Are all required values set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors in the weather patch.
   * @returns A list of errors in the weather patch.
   */
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    if (!this._id || this._id.length === 0) {
      errs.push(new ValidationError("id", "No ID has been set for the weather patch.", this));
    }
    if (this._startTimeOfDay == null) {
      errs.push(new ValidationError("dStartTimeOfDay", "No start time of day has been set on the weather patch.", this));
    }
    if (this._endTimeOfDay == null) {
      errs.push(new ValidationError("dEndTimeOfDay", "No end time of day has been set on the weather patch.", this));
    }
    if (this._startTime == null) {
      errs.push(new ValidationError("lStartTime", "No start time has been set on the weather patch.", this));
    }
    if (this._endTime == null) {
      errs.push(new ValidationError("lEndTime", "No end time has been set on the weather patch.", this));
    }
    if (this.type == WeatherPatchType.FILE) {
      if (!SocketMsg.skipFileTests) {
        //the filename must be an attachment or a local file
        if(!this._filename.startsWith("attachment:/") && !fs.existsSync(this._filename)) {
          errs.push(new ValidationError("filename", "The weather patch file does not exist.", this));
        }
      }
    }
    else if (this.type == WeatherPatchType.POLYGON) {
      if (this.feature.length == 0) {
        errs.push(new ValidationError("feature", "No points have been added to the polygon weather patch.", this));
      }
    }
    if (this.temperature != null) {
      let tempErr = this.temperature.checkValid();
      if (tempErr.length > 0) {
        let err = new ValidationError("temperature", "Errors found in weather patch temperature details.", this.temperature);
        tempErr.forEach(temp => {
          err.addChild(temp);
        });
        errs.push(err);
      }
    }
    if (this.rh != null) {
      let tempErr = this.rh.checkValid();
      if (tempErr.length > 0) {
        let err = new ValidationError("rh", "Errors found in weather patch relative humidity details.", this.rh);
        tempErr.forEach(temp => {
          err.addChild(temp);
        });
        errs.push(err);
      }
    }
    if (this.precip != null) {
      let tempErr = this.precip.checkValid();
      if (tempErr.length > 0) {
        let err = new ValidationError("precip", "Errors found in weather patch precipitation details.", this.precip);
        tempErr.forEach(temp => {
          err.addChild(temp);
        });
        errs.push(err);
      }
    }
    if (this.windSpeed != null) {
      let tempErr = this.windSpeed.checkValid();
      if (tempErr.length > 0) {
        let err = new ValidationError("windSpeed", "Errors found in weather patch wind speed details.", this.windSpeed);
        tempErr.forEach(temp => {
          err.addChild(temp);
        });
        errs.push(err);
      }
    }
    if (this.windDirection != null) {
      let tempErr = this.windDirection.checkValid();
      if (tempErr.length > 0) {
        let err = new ValidationError("windDirection", "Errors found in weather patch wind direction details.", this.windDirection);
        tempErr.forEach(temp => {
          err.addChild(temp);
        });
        errs.push(err);
      }
    }
    
    return errs;
  }
  
  /**
   * Streams the weather patch file to a socket.
   * @param builder
   */
  public stream(builder: net.Socket) {
    let tmp = this._id + '|' + this.comments + '|' + this._startTime.toISO() + '|' + this._endTime.toISO() + '|' + this._startTimeOfDay.toString() + '|' + this._endTimeOfDay.toString();
    if (this.temperature != null) {
      tmp = tmp + '|temperature|' + this.temperature.operation + '|' + this.temperature.value;
    }
    if (this.rh != null) {
      tmp = tmp + '|rh|' + this.rh.operation + '|' + this.rh.value;
    }
    if (this.precip != null) {
      tmp = tmp + '|precip|' + this.precip.operation + '|' + this.precip.value;
    }
    if (this.windSpeed != null) {
      tmp = tmp + '|windspeed|' + this.windSpeed.operation + '|' + this.windSpeed.value;
    }
    if (this.windDirection != null) {
      tmp = tmp + '|winddir|' + this.windDirection.operation + '|' + this.windDirection.value;
    }
    if (this.type == WeatherPatchType.FILE) {
      tmp = tmp + '|file|' + this._filename;
    }
    else if (this.type == WeatherPatchType.LANDSCAPE) {
      tmp = tmp + '|landscape';
    }
    else if (this.type == WeatherPatchType.POLYGON) {
      tmp = tmp + '|polygon';
      for (let ft of this.feature) {
        tmp = tmp + '|' + ft.latitude + '|' + ft.longitude;
      }
    }
    builder.write(WeatherPatch.PARAM_WEATHER_PATCH + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

export enum WeatherGridSector {
  NORTH = 0,
  NORTHEAST = 1,
  EAST = 2,
  SOUTHEAST = 3,
  SOUTH = 4,
  SOUTHWEST = 5,
  WEST = 6,
  NORTHWEST = 7
}

export enum WeatherGridType {
  DIRECTION = "direction",
  SPEED = "speed"
}

/**
 * Information about a grid file.
 * @author "Travis Redpath"
 */
export class WeatherGrid_GridFile {
  
  /**
   * The wind speed (required).
   */
  private _speed: number = -1;
  /**
   * Get the wind speed.
   */
  get speed(): number {
    return this._speed;
  }
  /**
   * Set the wind speed (km/h).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set speed(value: number) {
    if (SocketMsg.inlineThrowOnError && (value == null || value < 0 || value > 250)) {
      throw new RangeError("The wind speed is not valid.");
    }
    this._speed = value;
  }
  /**
   * The sector to apply this grid file to (required).
   */
  public sector: WeatherGridSector;
  /**
   * The location of the grid file (required).
   */
  private _filename: string = "";
  /**
   * Get the location of the file containing the grid data.
   */
  get filename(): string {
    return this._filename;
  }
  /**
   * Set the location of the file containing the grid data. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set filename(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The grid file does not exist.");
    }
    this._filename = value;
  }
  /**
   * The projection file for the grid file (required).
   */
  public projection: string = "";
  
  /**
   * Check to make sure all parameters have been set to valid values.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find a list of all errors in the weather grid file.
   * @returns A list of errors.
   */
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    if (this.speed < 0 || this.speed > 250) {
      errs.push(new ValidationError("speed", "The wind speed must be >= 0km/h and <= 250km/h.", this));
    }
    if (this.sector != WeatherGridSector.NORTH && this.sector != WeatherGridSector.NORTHEAST &&
        this.sector != WeatherGridSector.EAST && this.sector != WeatherGridSector.SOUTHEAST &&
        this.sector != WeatherGridSector.SOUTH && this.sector != WeatherGridSector.SOUTHWEST &&
        this.sector != WeatherGridSector.WEST && this.sector != WeatherGridSector.NORTHWEST) {
      errs.push(new ValidationError("sector", "The wind direction sector is not one of the valid values.", this));
    }
    if (!SocketMsg.skipFileTests) {
      //the filename must be an attachment or a local file
      if (!this._filename.startsWith("attachment:/") && !fs.existsSync(this._filename)) {
        errs.push(new ValidationError("filename", "The weather grid data file does not exist.", this));
      }
      //the projection file must be an attachment or a local file
      if (!this.projection.startsWith("attachment:/") && !fs.existsSync(this.projection)) {
        errs.push(new ValidationError("projection", "The weather grid data projection file does not exist.", this));
      }
    }
    return errs;
  }
}

/**
 * Information about a weather grid input.
 * @author "Travis Redpath"
 */
export class WeatherGrid {
  private static readonly PARAM_WEATHER_GRID = "weathergrid_2";
  
  protected static counter = 0;
  
  /**
   * The name of the weather grid. The name must be unique amongst the weather grid collection.
   */
  private _id: string;
  /**
   * Get the name of the weather grid.
   */
  get id(): string {
    return this._id;
  }
  /**
   * Set the name of the weather grid. Must be unique amongst the weather grid collection. Cannot be null or empty.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set id(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The name of the weather grid is not valid");
    }
    this.setName(value);
  }
  /**
   * Any comments about the weather grid (optional).
   */
  public comments: string = "";
  /**
   * The grid start time (required).
   */
  private _startTime: DateTime;
  /**
   * Get the weather grid start time as a Luxon DateTime.
   */
  get lStartTime(): DateTime {
    return this._startTime;
  }
  /**
   * Get the weather grid start time as an ISO8601 string.
   * @deprecated
   */
  get startTime(): string {
    return this._startTime == null ? "" : this._startTime.toISO();
  }
  /**
   * Set the weather grid start time using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lStartTime(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The weather grid start time is not valid");
    }
    this._startTime = value;
  }
  /**
   * Set the weather grid start time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set startTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The weather patch start time is not valid");
    }
    this._startTime = DateTime.fromISO(value);
  }
  /**
   * The grid end time (required).
   */
  private _endTime: DateTime;
  /**
   * Get the weather grid end time as a Luxon DateTime.
   */
  get lEndTime(): DateTime {
    return this._endTime;
  }
  /**
   * Get the weather grid end time as an ISO8601 string.
   * @deprecated
   */
  get endTime(): string {
    return this._endTime == null ? "" : this._endTime.toISO();
  }
  /**
   * Set the weather grid end time using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lEndTime(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The weather grid end time is not valid");
    }
    this._endTime = value;
  }
  /**
   * Set the weather grid end time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set endTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The weather grid end time is not valid");
    }
    this._endTime = DateTime.fromISO(value);
  }
  /**
   * The patches start time of day (required).
   */
  private _startTimeOfDay: Duration;
  /**
   * Get the weather grid start time of day as a Duration.
   */
  get dStartTimeOfDay(): Duration {
    return this._startTimeOfDay;
  }
  /**
   * Get the weather grid start time of day as an ISO8601 string.
   * @deprecated
   */
  get startTimeOfDay(): string {
    return this._startTimeOfDay == null ? "" : this._startTimeOfDay.toString();
  }
  /**
   * Set the weather grid start time of day using a Duration. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set dStartTimeOfDay(value: Duration) {
    if (SocketMsg.inlineThrowOnError && (value == null || !value.isValid())) {
      throw new RangeError("The weather grid start time of dayis not valid");
    }
    this._startTimeOfDay = value;
  }
  /**
   * Set the weather grid start time of day using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set startTimeOfDay(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The weather grid start time of day is not valid");
    }
    this._startTimeOfDay = new Duration();
    this._startTimeOfDay.fromString(value);
  }
  /**
   * The patches end time of day (required).
   */
  private _endTimeOfDay: Duration;
  /**
   * Get the weather grid end time of day as a Duration.
   */
  get dEndTimeOfDay(): Duration {
    return this._endTimeOfDay;
  }
  /**
   * Get the weather grid end time of day as an ISO8601 string.
   * @deprecated
   */
  get endTimeOfDay(): string {
    return this._endTimeOfDay == null ? "" : this._endTimeOfDay.toString();
  }
  /**
   * Set the weather grid end time of day using a Duration. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set dEndTimeOfDay(value: Duration) {
    if (SocketMsg.inlineThrowOnError && (value == null || !value.isValid())) {
      throw new RangeError("The weather grid end time of dayis not valid");
    }
    this._endTimeOfDay = value;
  }
  /**
   * Set the weather grid end time of day using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set endTimeOfDay(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The weather grid end time of day is not valid");
    }
    this._endTimeOfDay = new Duration();
    this._endTimeOfDay.fromString(value);
  }
  /**
   * An array of WeatherGrid_GridFile. There can be one for each wind sector (North, Northeast, East, etc.).
   */
  public gridData = new Array<WeatherGrid_GridFile>();
  /**
   * Whether this wind grid is for wind speed, or wind direction (required). Must be one of TYPE_DIRECTION and TYPE_SPEED.
   */
  public type: WeatherGridType;
  /**
   * The default sector data. If specified {@link defaultValuesProjection} must also be specified.
   */
  public defaultValuesFile: string;
  /**
   * The projection file for the default sector data. Must be specified if {@link defaultValuesFile} is specified.
   */
  public defaultValuesProjection: string;
  
  /**
   * A convenience method for specifying the default values grid file and its projection.
   * @param defaultValuesFile The file or attachment that contains a grid of default values for the grid.
   * @param defaultValuesProjection The projection file for the specified default values file.
   */
  public setDefaultValuesGrid(defaultValuesFile: string, defaultValuesProjection: string) {
    this.defaultValuesFile = defaultValuesFile;
    this.defaultValuesProjection = defaultValuesProjection;
  }
  
  public getId(): string {
    return this._id;
  }
  
  /**
   * Set the name of the weather grid. This name must be unique within
   * the simulation. The name will get a default value when the
   * weather grid is constructed but can be overriden with this method.
   */
  public setName(name: string): void {
    this._id = name.replace(/\|/g, "");
  }
  
  public constructor() {
    this._id = "wthrgrd" + WeatherGrid.counter;
    WeatherGrid.counter += 1;
  }
  
  /**
   * Add a direction file to the weather grid.
   * @param filename The location of the grid file. Can either be the actual file path or the attachment URL returned 
   * 				   from {@link WISE#addAttachment}
   * @param projection The projection file.
   * @param sector The sector (wind direction) to apply this grid file to. Only one of each sector is allowed per station.
   * @param speed The wind speed.
   * @throws Exception Throws an exception if a file for the same sector has already been added.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set and {@link SocketMsg.skipFileTests} is not set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if the file doesn't exist.
   */
  public addDirectionFile(filename: string, projection: string, sector: WeatherGridSector, speed: number): WeatherGrid_GridFile {
    for (let gd of this.gridData) {
      if (gd.sector == sector) {
        throw new Error("Only one grid allowed per sector");
      }
    }
    let dir = new WeatherGrid_GridFile();
    dir.sector = sector;
    dir.speed = speed;
    dir.filename = filename;
    dir.projection = projection;
    this.gridData.push(dir);
    return dir;
  }
  
  /**
   * Remove a WeatherGrid_GridFile object from the weather grid.
   * @param weatherGrid The WeatherGrid_GridFile object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeDirectionFile(weatherGrid: WeatherGrid_GridFile): boolean {
    var index = this.gridData.indexOf(weatherGrid);
    if (index != -1) {
      this.gridData.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Are all required values set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors in the weather grid.
   * @returns A list of errors found.
   */
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    if (!this._id || this._id.length === 0) {
      errs.push(new ValidationError("id", "No ID has been set for the weather grid.", this));
    }
    if (this._startTimeOfDay == null) {
      errs.push(new ValidationError("dStartTimeOfDay", "No start time of day has been set on the weather grid.", this));
    }
    if (this._endTimeOfDay == null) {
      errs.push(new ValidationError("dEndTimeOfDay", "No end time of day has been set on the weather grid.", this));
    }
    if (this._startTime == null) {
      errs.push(new ValidationError("lStartTime", "No start time has been set on the weather grid.", this));
    }
    if (this._endTime == null) {
      errs.push(new ValidationError("lEndTime", "No start time has been set on the weather grid.", this));
    }
    let dataErrs = new Array<ValidationError>();
    for (let i = 0; i < this.gridData.length; i++) {
      let tempErr = this.gridData[i].checkValid();
      if (tempErr.length > 0) {
        let err = new ValidationError(i, `Error in weather grid data file at ${i}.`, this.gridData);
        tempErr.forEach(temp => {
          err.addChild(temp);
        });
        dataErrs.push(err);
      }
    }
    if (dataErrs.length > 0) {
      let tempErr = new ValidationError("gridData", "Errors in weather grid data.", this);
      dataErrs.forEach(err => {
        tempErr.addChild(err);
      });
      errs.push(tempErr);
    }
    if (this.defaultValuesFile != null && this.defaultValuesFile.length > 0) {
      if (this.defaultValuesProjection == null || this.defaultValuesProjection.length == 0) {
        errs.push(new ValidationError("defaultValuesProjection", "The projection for the default sector data is required.", this));
      }
      else if (!SocketMsg.skipFileTests) {
        //the filename must be an attachment or a local file
        if (!this.defaultValuesFile.startsWith("attachment:/") && !fs.existsSync(this.defaultValuesFile)) {
          errs.push(new ValidationError("defaultValuesFile", "The default grid data file does not exist.", this));
        }
        //the projection file must be an attachment or a local file
        if (!this.defaultValuesProjection.startsWith("attachment:/") && !fs.existsSync(this.defaultValuesProjection)) {
          errs.push(new ValidationError("defaultValuesProjection", "The default grid data projection file does not exist.", this));
        }
      }
    }
    return errs;
  }
  
  /**
   * Streams the weather grid file to a socket.
   * @param builder
   */
  public stream(builder: net.Socket) {
    let tmp = this._id + '|' + this.comments + '|' + this._startTime.toISO() + '|' + this._endTime.toISO() + '|' + this._startTimeOfDay.toString() + '|' + this._endTimeOfDay.toString() + '|' + this.type;
    tmp = tmp + '|' + this.gridData.length;
    for (let gd of this.gridData) {
      tmp = tmp + '|' + gd.speed + '|' + gd.sector + '|' + gd.filename + '|' + gd.projection;
    }
    if (this.defaultValuesFile != null && this.defaultValuesFile.length > 0) {
      tmp = tmp + '|' + this.defaultValuesFile + '|' + this.defaultValuesProjection;
    }
    else {
      tmp = tmp + '|-1|-1'
    }
    builder.write(WeatherGrid.PARAM_WEATHER_GRID + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

export enum FuelPatchType {
  FILE = 0,
  POLYGON = 2,
  LANDSCAPE = 4
}

export enum FromFuel {
  NODATA = "noData",
  ALL = "allFuels",
  ALL_COMBUSTABLE = "allCombustibleFuels"
}

/**
 * A fuel patch file.
 * @author "Travis Redpath"
 */
export class FuelPatch {
  private static readonly PARAM_FUELPATCH = "fuelpatch";
  
  protected static counter = 0;
  
  /**
   * The name of the fuel patch. The name must be unique amongst the fuel patch collection.
   */
  private _id: string;
  /**
   * Get the name of the fuel patch.
   */
  get id(): string {
    return this._id;
  }
  /**
   * Set the name of the fuel patch. Must be unique amongst the fuel patch collection. Cannot be null or empty.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set id(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The name of the fuel patch is not valid");
    }
    this.setName(value);
  }
  /**
   * The fuel the patch changes to.
   */
  public toFuel: string = "";
  /**
   * Any comments about the fuel patch (optional).
   */
  public comments: string = "";
  /**
   * The type of fuel patch (required).
   */
  public type: FuelPatchType = -1;
  /**
   * The filename associated with this fuel patch. Only valid if type is FILE.
   */
  private _filename: string = "";
  /**
   * Get the location of the file containing the fuel patch.
   */
  get filename(): string {
    return this._filename;
  }
  /**
   * Set the location of the file containing the fuel patch. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set filename(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The fuel patch file does not exist.");
    }
    this._filename = value;
  }
  /**
   * An array of LatLon describing the fuel patch. Only valid if type is POLYGON.
   */
  public feature = new Array<LatLon>();
  /**
   * The fuel that the patch changes from (one of this, {@link #fromFuelIndex}, or {@link #fromFuelRule} is required).
   */
  public fromFuel: string|null = null;
  /**
   * The rule about which fuels to apply the patch to (one of this, {@link #fromFuelIndex}, or {@link #fromFuel} is required).
   * If fromFuel is not specified this must be set.
   */
  public fromFuelRule: FromFuel|null = null;
  /**
   * Instead of using the name of a fuel, reference it by index.
   */
  public toFuelIndex: number|null = null;
  /**
   * Instead of using the name of a fuel, reference it by index.
   */
  public fromFuelIndex: number|null = null;
  
  public getId(): string {
    return this._id;
  }
  
  /**
   * Set the name of the fuel patch. This name must be unique within
   * the simulation. The name will get a default value when the
   * fuel patch is constructed but can be overriden with this method.
   */
  public setName(name: string): void {
    this._id = name.replace(/\|/g, "");
  }
  
  public constructor() {
    this._id = "flptch" + FuelPatch.counter;
    FuelPatch.counter += 1;
  }
  
  /**
   * Are all required values set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may be in the fuel patch.
   */
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    if (!this._id || this._id.length === 0) {
      errs.push(new ValidationError("id", "No ID has been set for the fuel patch.", this));
    }
    if (this.type != FuelPatchType.FILE && this.type != FuelPatchType.LANDSCAPE && this.type != FuelPatchType.POLYGON) {
      errs.push(new ValidationError("type", "An invalid type has been set for the fuelbreak. Must be one of FILE, LANDSCAPE, or POLYGON.", this));
    }
    if (this.fromFuel == null && this.fromFuelRule != FromFuel.ALL && this.fromFuelRule != FromFuel.NODATA &&
        this.fromFuelRule != FromFuel.ALL_COMBUSTABLE && this.fromFuelIndex == null) {
      errs.push(new ValidationError("fromFuel", "No from fuel has been set on the fuel patch.", this));
    }
    if (this.toFuel.length == 0 && this.toFuelIndex == null) {
      errs.push(new ValidationError("toFuel", "No to fuel has been set on the fuel patch.", this));
    }
    if (this.type == FuelPatchType.FILE) {
      if (!SocketMsg.skipFileTests) {
        //the file must be an attachment or a local file
        if (!this._filename.startsWith("attachment:/") && !fs.existsSync(this._filename)) {
          errs.push(new ValidationError("filename", "The fuel patch file does not exist.", this));
        }
      }
    }
    else if (this.type == FuelPatchType.POLYGON) {
      if (this.feature.length == 0) {
        errs.push(new ValidationError("feature", "No points have been added to the polygon fuel patch.", this));
      }
    }
    return errs;
  }
  
  /**
   * Streams the fuel patch file to a socket.
   * @param builder
   */
  public stream(builder: net.Socket) {
    let tmp = this._id + '|' + this.comments;
    if (this.toFuelIndex == null) {
      tmp = tmp + '|' + this.toFuel;
    }
    else {
      tmp = tmp + '|' + this.toFuelIndex;
    }
    if (this.fromFuelRule == null) {
      if (this.fromFuel == null) {
        tmp = tmp + '|ifuel|' + this.fromFuelIndex;
      }
      else {
        tmp = tmp + '|fuel|' + this.fromFuel;
      }
    }
    else {
      tmp = tmp + '|rule|' + this.fromFuelRule;
    }
    if (this.type == FuelPatchType.FILE) {
      tmp = tmp + '|file|' + this._filename;
    }
    else if (this.type == FuelPatchType.LANDSCAPE) {
      tmp = tmp + '|landscape';
    }
    else if (this.type == FuelPatchType.POLYGON) {
      tmp = tmp + '|polygon';
      for (let ft of this.feature) {
        tmp = tmp + '|' + ft.latitude + '|' + ft.longitude;
      }
    }
    builder.write(FuelPatch.PARAM_FUELPATCH + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

export enum FuelBreakType {
  FILE = 0,
  POLYLINE = 1,
  POLYGON = 2
}

/**
 * A fuel break file.
 * @author "Travis Redpath"
 */
export class FuelBreak {
  private static readonly PARAM_FUELBREAK = "fuelbreakfile";
  
  protected static counter = 0;
  
  /**
   * The name of the fuel break. The name must be unique amongst fuel break collections.
   */
  private _id: string;
  /**
   * Get the name of the fuel break.
   */
  get id(): string {
    return this._id;
  }
  /**
   * Set the name of the fuel break. Must be unique amongst the fuel break collection. Cannot be null or empty.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set id(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The name of the fuel break is not valid");
    }
    this.setName(value);
  }
  /**
   * The width of the fuel break (required if type is POLYLINE, otherwise ignored).
   */
  private _width: number = -1;
  /**
   * Get the width of the fuel break.
   */
  get width(): number {
    return this._width;
  }
  /**
   * Set the width of the fuel break (m).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set width(value: number) {
    if (SocketMsg.inlineThrowOnError && (value == null || value < 0 || value > 250)) {
      throw new RangeError("The width of the fuel break is not valid.");
    }
    this._width = value;
  }
  /**
   * Comments about the fuel break (optional).
   */
  public comments: string = "";
  /**
   * The type of fuelbreak (required).
   */
  public type: FuelBreakType = -1;
  /**
   * The filename associated with this fuel break. Only valid if type is FILE.
   */
  private _filename: string = "";
  /**
   * Get the location of the file containing the fuel break.
   */
  get filename(): string {
    return this._filename;
  }
  /**
   * Set the location of the file containing the fuel break. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set filename(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The fuel break file does not exist.");
    }
    this._filename = value;
  }
  /**
   * An array of LatLon describing the fuel break. Only valid if type is POLYLINE or POLYGON.
   */
  public feature = new Array<LatLon>();
  
  public getId(): string {
    return this._id;
  }
  
  /**
   * Set the name of the fuel break. This name must be unique within
   * the simulation. The name will get a default value when the
   * fuel break is constructed but can be overriden with this method.
   */
  public setName(name: string): void {
    this._id = name.replace(/\|/g, "");
  }
  
  public constructor() {
    this._id = "flbrk" + FuelBreak.counter;
    FuelBreak.counter += 1;
  }
  
  /**
   * Are all required values set.
   * @return boolean
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find any errors that may exist in the fuelbreak.
   * @returns A list of errors.
   */
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    if (!this._id || this._id.length === 0) {
      errs.push(new ValidationError("id", "No ID has been set for the fuelbreak.", this));
    }
    if (this.type == FuelBreakType.POLYLINE) {
      if (this._width < 0 || this._width > 250.0) {
        errs.push(new ValidationError("width", "The fuelbreak width must be greater than 0m and less than 250m.", this));
      }
    }
    else if (this.type == FuelBreakType.FILE) {
      if (!SocketMsg.skipFileTests) {
        //the file must be an attachment or a local file
        if(!this._filename.startsWith("attachment:/") && !fs.existsSync(this._filename)) {
          errs.push(new ValidationError("filename", "The fuelbreak file does not exist.", this));
        }
      }
    }
    else if (this.type == FuelBreakType.POLYGON) {
      if (this.feature.length == 0) {
        errs.push(new ValidationError("feature", "No points have been added to the polygon fuelbreak.", this));
      }
    }
    else {
      errs.push(new ValidationError("type", "An invalid type has been set for the fuelbreak. Must be one of FILE, POLYLINE, or POLYGON.", this));
    }
    return errs;
  }
  
  /**
   * Streams the fuel break file to a socket.
   * @param builder
   */
  public stream(builder: net.Socket) {
    let tmp = this._id + '|' + this.width + '|' + this.comments;
    if (this.type == FuelBreakType.FILE) {
      tmp = tmp + '|file|' + this._filename;
    }
    else if (this.type == FuelBreakType.POLYLINE) {
      tmp = tmp + '|polyline';
      for (let ft of this.feature) {
        tmp = tmp + '|' + ft.latitude + '|' + ft.longitude;
      }
    }
    else if (this.type == FuelBreakType.POLYGON) {
      tmp = tmp + '|polygon';
      for (let ft of this.feature) {
        tmp = tmp + '|' + ft.latitude + '|' + ft.longitude;
      }
    }
    builder.write(FuelBreak.PARAM_FUELBREAK + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

/**
 * All information regarding the input files for W.I.S.E..
 * @author "Travis Redpath"
 */
export class WISEInputsFiles {
  private static readonly PARAM_PROJ = "projfile";
  private static readonly PARAM_LUT = "lutfile";
  private static readonly PARAM_FUELMAP = "fuelmapfile";
  private static readonly PARAM_ELEVATION = "elevationfile";
  
  /**The projection file (required).
   * The location of the projection file.
   */
  private _projFile: string = "";
  /**
   * Get the location of the projection file.
   */
  get projFile(): string {
    return this._projFile;
  }
  /**
   * Set the location of the projection file. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set projFile(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The projection file does not exist.");
    }
    this._projFile = value;
  }
  /**The LUT file (required).
   * The location of the LUT file.
   */
  private _lutFile: string = "";
  /**
   * Get the location of the lookup table file.
   */
  get lutFile(): string {
    return this._lutFile;
  }
  /**
   * Set the location of the lookup table file. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lutFile(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The lookup table file does not exist.");
    }
    this._lutFile = value;
  }
  /**The fuel map file (required).
   * The location of the fuel map file.
   */
  private _fuelmapFile: string = "";
  /**
   * Get the location of the fuel map file.
   */
  get fuelmapFile(): string {
    return this._fuelmapFile;
  }
  /**
   * Set the location of the fuel map file. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set fuelmapFile(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The fuel map file does not exist.");
    }
    this._fuelmapFile = value;
  }
  /**The elevation map file (optional).
   * The location of the elevation file.
   */
  private _elevFile: string = "";
  /**
   * Get the location of the elevation file.
   */
  get elevFile(): string {
    return this._elevFile;
  }
  /**
   * Set the location of the elevation file. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set). Can be null to remove the elevation file.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set elevFile(value: string) {
    if (SocketMsg.inlineThrowOnError && value != null && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The fuel break file does not exist.");
    }
    if (value == null) {
      this._elevFile = "";
    }
    else {
      this._elevFile = value;
    }
  }
  /**
   * An array of fuel break files.
   */
  public fuelBreakFiles = new Array<FuelBreak>();
  /**
   * An array of fuel patch files.
   */
  public fuelPatchFiles = new Array<FuelPatch>();
  /**
   * An array of weather files.
   */
  public weatherGridFiles = new Array<WeatherGrid>();
  /**
   * An array of weather patch files.
   */
  public weatherPatchFiles = new Array<WeatherPatch>();
  /**
   * An array of grid files.
   */
  public gridFiles = new Array<GridFile>();
  
  /**
   * Are all required values specified.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that exist in the W.I.S.E. input files.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    let _errors = new Array<ValidationError>();
    
    //check if the projection was specified
    if (this.projFile.length == 0) {
      _errors.push(new ValidationError("projFile", "No projection file has been specified.", this));
    }
    else if (!SocketMsg.skipFileTests && !this._projFile.startsWith("attachment:/") && !fs.existsSync(this._projFile)) {
      _errors.push(new ValidationError("projFile", "The specified projection file does not exist.", this));
    }
    //check if the LUT file was specified
    if (this.lutFile.length == 0) {
      _errors.push(new ValidationError("lutFile", "No lookup table has been specified.", this));
    }
    else if (!SocketMsg.skipFileTests && !this._lutFile.startsWith("attachment:/") && !fs.existsSync(this._lutFile)) {
      _errors.push(new ValidationError("lutFile", "The specified lookup table does not exist.", this));
    }
    //check if the fuelmap was specified
    if (this.fuelmapFile.length == 0) {
      _errors.push(new ValidationError("fuelmapFile", "No fuelmap file has been specified.", this));
    }
    else if (!SocketMsg.skipFileTests && !this._fuelmapFile.startsWith("attachment:/") && !fs.existsSync(this._fuelmapFile)) {
      _errors.push(new ValidationError("fuelmapFile", "The specified fuelmap file does not exist.", this));
    }
    //the elevation file is optional but if it was set make sure it exists
    if (this._elevFile.length > 0 && !SocketMsg.skipFileTests && !this.elevFile.startsWith("attachment:/") && !fs.existsSync(this._elevFile)) {
      _errors.push(new ValidationError("elevFile", "The specified elevation file does not exist.", this));
    }
    let tempErrs = new Array<ValidationError>();
    //check the fuelbreak files for validity
    for (let i = 0; i < this.fuelBreakFiles.length; i++) {
      let fbErr = new ValidationError(i, `Errors found in the fuelbreak at index ${i}.`, this.fuelBreakFiles);
      for (let j = i + 1; j < this.fuelBreakFiles.length; j++) {
        if (this.fuelBreakFiles[i].id.toUpperCase() === this.fuelBreakFiles[j].id.toUpperCase()) {
          let err = new ValidationError("id", "Duplicate fuelbreak IDs.", this.fuelBreakFiles[i]);
          fbErr.addChild(err);
          break;
        }
      }
      this.fuelBreakFiles[i].checkValid().forEach(err => {
        fbErr.addChild(err);
      });
      if (fbErr.children.length > 0) {
        tempErrs.push(fbErr);
      }
    }
    if (tempErrs.length > 0) {
      let err = new ValidationError("fuelBreakFiles", "Errors found in fuelbreaks.", this);
      tempErrs.forEach(temp => {
        err.addChild(temp);
      });
      _errors.push(err);
    }
    tempErrs = new Array<ValidationError>();
    //check the fuel patch files for validity
    for (let i = 0; i < this.fuelPatchFiles.length; i++) {
      let fpErr = new ValidationError(i, `Errors found in the fuel patch at index ${i}.`, this.fuelPatchFiles);
      for (let j = i + 1; j < this.fuelPatchFiles.length; j++) {
        if (this.fuelPatchFiles[i].id.toUpperCase() === this.fuelPatchFiles[j].id.toUpperCase()) {
          let err = new ValidationError("id", "Duplicate fuel patch IDs.", this.fuelPatchFiles[i]);
          fpErr.addChild(err);
          break;
        }
      }
      this.fuelPatchFiles[i].checkValid().forEach(err => {
        fpErr.addChild(err);
      });
      if (fpErr.children.length > 0) {
        tempErrs.push(fpErr);
      }
    }
    if (tempErrs.length > 0) {
      let err = new ValidationError("fuelPatchFiles", "Errors found in fuel patches.", this);
      tempErrs.forEach(temp => {
        err.addChild(temp);
      });
      _errors.push(err);
    }
    tempErrs = new Array<ValidationError>();
    //check the weather grid files for validity
    for (let i = 0; i < this.weatherGridFiles.length; i++) {
      let wgErr = new ValidationError(i, `Errors found in the weather grid at index ${i}.`, this.weatherGridFiles);
      for (let j = i + 1; j < this.weatherGridFiles.length; j++) {
        if (this.weatherGridFiles[i].id.toUpperCase() === this.weatherGridFiles[j].id.toUpperCase()) {
          let err = new ValidationError("id", "Duplicate weather grid IDs.", this.weatherGridFiles[i]);
          wgErr.addChild(err);
          break;
        }
      }
      this.weatherGridFiles[i].checkValid().forEach(err => {
        wgErr.addChild(err);
      });
      if (wgErr.children.length > 0) {
        tempErrs.push(wgErr);
      }
    }
    if (tempErrs.length > 0) {
      let err = new ValidationError("weatherGridFiles", "Errors found in weather grids.", this);
      tempErrs.forEach(temp => {
        err.addChild(temp);
      });
      _errors.push(err);
    }
    tempErrs = new Array<ValidationError>();
    //check the weather patch files for validity
    for (let i = 0; i < this.weatherPatchFiles.length; i++) {
      let wgErr = new ValidationError(i, `Errors found in the weather patch at index ${i}.`, this.weatherPatchFiles);
      for (let j = i + 1; j < this.weatherPatchFiles.length; j++) {
        if (this.weatherPatchFiles[i].id.toUpperCase() === this.weatherPatchFiles[j].id.toUpperCase()) {
          let err = new ValidationError("id", "Duplicate weather patch IDs.", this.weatherGridFiles[i]);
          wgErr.addChild(err);
          break;
        }
      }
      this.weatherPatchFiles[i].checkValid().forEach(err => {
        wgErr.addChild(err);
      });
      if (wgErr.children.length > 0) {
        tempErrs.push(wgErr);
      }
    }
    if (tempErrs.length > 0) {
      let err = new ValidationError("weatherPatchFiles", "Errors found in weather patches.", this);
      tempErrs.forEach(temp => {
        err.addChild(temp);
      });
      _errors.push(err);
    }
    tempErrs = new Array<ValidationError>();
    //check the grid files for validity
    for (let i = 0; i < this.gridFiles.length; i++) {
      let gfErr = new ValidationError(i, `Errors found in the weather patch at index ${i}.`, this.weatherPatchFiles);
      for (let j = i + 1; j < this.gridFiles.length; j++) {
        if (this.gridFiles[i].id.toUpperCase() === this.gridFiles[j].id.toUpperCase()) {
          let err = new ValidationError("id", "Duplicate grid file IDs.", this.weatherGridFiles[i]);
          gfErr.addChild(err);
          break;
        }
      }
      this.gridFiles[i].checkValid().forEach(err => {
        gfErr.addChild(err);
      });
      if (gfErr.children.length > 0) {
        tempErrs.push(gfErr);
      }
    }
    if (tempErrs.length > 0) {
      let err = new ValidationError("gridFiles", "Errors found in grid files.", this);
      tempErrs.forEach(temp => {
        err.addChild(temp);
      });
      _errors.push(err);
    }
    return _errors;
  }
  
  /**
   * Streams the input files to a socket.
   * @param builder
   */
  public stream(builder: net.Socket) {
    builder.write(WISEInputsFiles.PARAM_PROJ + SocketMsg.NEWLINE);
    builder.write(this.projFile + SocketMsg.NEWLINE);
    
    builder.write(WISEInputsFiles.PARAM_LUT + SocketMsg.NEWLINE);
    builder.write(this.lutFile + SocketMsg.NEWLINE);
    
    builder.write(WISEInputsFiles.PARAM_FUELMAP + SocketMsg.NEWLINE);
    builder.write(this.fuelmapFile + SocketMsg.NEWLINE);
    
    if (this.elevFile.length > 0)
    {
      builder.write(WISEInputsFiles.PARAM_ELEVATION + SocketMsg.NEWLINE);
      builder.write(this.elevFile + SocketMsg.NEWLINE);
    }
    
    for (let fb of this.fuelBreakFiles) {
      fb.stream(builder);
    }
    
    for (let fp of this.fuelPatchFiles) {
      fp.stream(builder);
    }
    
    for (let wg of this.weatherGridFiles) {
      wg.stream(builder);
    }
    
    for (let wp of this.weatherPatchFiles) {
      wp.stream(builder);
    }
    
    for (let gf of this.gridFiles) {
      gf.stream(builder);
    }
    
    return "";
  }
}

export enum HFFMCMethod {
  VAN_WAGNER = 0,
  LAWSON = 1
}

/**
 * Information about a weather stream.
 * @author "Travis Redpath"
 */
export class WeatherStream {
  private static readonly PARAM_WEATHERSTREAM = "weatherstream";
  
  protected static counter = 0;
  
  /**
   * The name of the weather stream. The name must be unique amongst a weather stream collection.
   */
  private _id: string;
  /**
   * Get the name of the weather stream.
   */
  get id(): string {
    return this._id;
  }
  /**
   * Set the name of the weather stream. Must be unique amongst the weather stream collection. Cannot be null or empty.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set id(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The name of the weather stream is not valid");
    }
    this.setName(value);
  }
  /**
   * User comments about the weather stream (optional).
   */
  public comments: string = "";
  /**
   * The location of the file containing the stream data (required).
   */
  private _filename: string = "";
  /**
   * Get the location of the file containing the weather stream.
   */
  get filename(): string {
    return this._filename;
  }
  /**
   * Set the location of the file containing the weather stream. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set filename(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The weather stream file does not exist.");
    }
    this._filename = value;
  }
  /**
   * Yesterday's daily starting fine fuel moisture code (required).
   */
  private _starting_ffmc: number = -1;
  /**
   * Get yesterday's daily starting fine fuel moisture code.
   */
  get starting_ffmc(): number {
    return this._starting_ffmc;
  }
  /**
   * Set yesterday's daily starting fine fuel moisture code. Must be in [0, 101].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set starting_ffmc(value: number) {
    if (SocketMsg.inlineThrowOnError && (value == null || value < 0 || value > 101)) {
      throw new RangeError("The start FFMC value is not valid.");
    }
    this._starting_ffmc = value;
  }
  /**
   * Yesterday's daily starting duff moisture code (required).
   */
  private _starting_dmc: number = -1;
  /**
   * Get yesterday's daily starting duff moisture code.
   */
  get starting_dmc(): number {
    return this._starting_dmc;
  }
  /**
   * Set yesterday's daily starting duff moisture code. Must be in [0, 500].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set starting_dmc(value: number) {
    if (SocketMsg.inlineThrowOnError && (value == null || value < 0 || value > 500)) {
      throw new RangeError("The start DMC value is not valid.");
    }
    this._starting_dmc = value;
  }
  /**
   * Yesterday's daily starting drought code (required).
   */
  private _starting_dc: number = -1;
  /**
   * Get yesterday's daily starting drought code.
   */
  get starting_dc(): number {
    return this._starting_dc;
  }
  /**
   * Set yesterday's daily starting drought code. Must be in [0, 1500].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set starting_dc(value: number) {
    if (SocketMsg.inlineThrowOnError && (value == null || value < 0 || value > 1500)) {
      throw new RangeError("The start DC value is not valid.");
    }
    this._starting_dc = value;
  }
  /**
   * Yesterday's daily starting precipitation (13:01-23:00 if daylight savings time, 12:01-23:00 otherwise) (required).
   */
  private _starting_precip: number = -1;
  /**
   * Get yesterday's daily starting precipitation.
   */
  get starting_precip(): number {
    return this._starting_precip;
  }
  /**
   * Set yesterday's daily starting precipitation. Must be greater than or equal to 0.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set starting_precip(value: number) {
    if (SocketMsg.inlineThrowOnError && (value == null || value < 0)) {
      throw new RangeError("The start precipitation value is not valid.");
    }
    this._starting_precip = value;
  }
  /**
   * The hour that the HFFMC value is for (required). Must be between -1 and 23 inclusive.
   */
  private _hffmc_hour: number;
  /**
   * Get the hour that the HFFMC value is for.
   */
  get hffmc_hour(): number {
    return this._hffmc_hour;
  }
  /**
   * Set the hour that the HFFMC value is for. Must be in [0,23]. Use -1 to use the default.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set hffmc_hour(value: number) {
    if (SocketMsg.inlineThrowOnError && (value == null || value < -1 || value > 23)) {
      throw new RangeError("The HFFMC hour is not valid.");
    }
    this._hffmc_hour = value;
  }
  /**
   * The HFFMC value (required).
   */
  public hffmc_value: number;
  /**
   * The HFFMC calculation method (required).
   */
  public hffmc_method: HFFMCMethod = -1;
  /**
   * Diurnal parameters - temperature alpha (optional).
   */
  public diurnal_temperature_alpha: number = 9999;
  /**
   * Diurnal parameters - temperature beta (optional).
   */
  public diurnal_temperature_beta: number = 9999;
  /**
   * Diurnal parameters - temperature gamma (optional).
   */
  public diurnal_temperature_gamma: number = 9999;
  /**
   * Diurnal parameters - wind speed alpha (optional).
   */
  public diurnal_windspeed_alpha: number = 9999;
  /**
   * Diurnal parameters - wind speed beta (optional).
   */
  public diurnal_windspeed_beta: number = 9999;
  /**
   * Diurnal parameters - wind speed gamma (optional).
   */
  public diurnal_windspeed_gamma: number = 9999;
  /**
   * The starting time of the weather stream (required).
   */
  private _start_time: DateTime;
  /**
   * Get the weather stream starting date as a Luxon DateTime.
   */
  get lstart_time(): DateTime {
    return this._start_time;
  }
  /**
   * Get the weather grid end time as an ISO8601 string.
   * @deprecated
   */
  get start_time(): string {
    return this._start_time == null ? "" : this._start_time.toISODate();
  }
  /**
   * Set the weather grid end time using a Luxon DateTime. Cannot be null. Only the date component will be used.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lstart_time(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The weather stream start date is not valid");
    }
    this._start_time = value;
  }
  /**
   * Set the weather grid end time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set start_time(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The weather stream start date is not valid");
    }
    this._start_time = DateTime.fromISO(value);
  }
  /**
   * The ending time of the weather stream (required). Must be formatted as 'YYYY-MM-DD'.
   */
  private _end_time: DateTime;
  /**
   * Get the weather stream end time as a Luxon DateTime.
   */
  get lend_time(): DateTime {
    return this._end_time;
  }
  /**
   * Get the weather stream end time as an ISO8601 string.
   * @deprecated
   */
  get end_time(): string {
    return this._end_time == null ? "" : this._end_time.toISODate();
  }
  /**
   * Set the weather stream end date using a Luxon DateTime. Cannot be null. Only the date component will be used.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lend_time(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The weather stream end date is not valid");
    }
    this._end_time = value;
  }
  /**
   * Set the weather stream end date using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set end_time(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The weather stream end date is not valid");
    }
    this._end_time = DateTime.fromISO(value);
  }
  /**
   * The ID of the weather station that this stream came from.
   */
  protected parentId: string;
  
  /**
   * Get the unique ID of this weather stream.
   */
  public getId(): string {
    return this._id;
  }
  
  /**
   * Set the name of the weather stream. This name must be unique within
   * the simulation. The name will get a default value when the
   * weather stream is constructed but can be overriden with this method.
   */
  public setName(name: string): void {
    this._id = name.replace(/\|/g, "");
  }
  
  /**
   * Get the unique ID of the weather station that this stream came from.
   */
  public getParentId(): string {
    return this.parentId;
  }
  
  /**
   * Construct a new weather stream.
   * @param parentId The ID of the weather station that the stream came from.
   */
  public constructor(parentId: string) {
    this._id = "wthrstrm" + WeatherStream.counter;
    WeatherStream.counter += 1;
    this.parentId = parentId;
  }
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find any errors that may be in the weather stream.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    if (!this._id || this._id.length === 0) {
      errs.push(new ValidationError("id", "No ID has been set for the weather stream.", this));
    }
    if (!SocketMsg.skipFileTests) {
      //the file must be an attachment or a local file
      if (!this._filename.startsWith("attachment:/") && !fs.existsSync(this._filename)) {
        errs.push(new ValidationError("filename", "The specified weather file does not exist.", this));
      }
    }
    if (this._starting_ffmc < 0 || this._starting_ffmc > 101.0) {
      errs.push(new ValidationError("starting_ffmc", "Invalid starting FFMC value for the weather stream.", this));
    }
    if (this._starting_dmc < 0 || this._starting_dmc > 500.0) {
      errs.push(new ValidationError("starting_dmc", "Invalid starting DMC value for the weather stream.", this));
    }
    if (this._starting_dc < 0 || this._starting_dc > 1500.0) {
      errs.push(new ValidationError("starting_dc", "Invalid starting DC value for the weather stream.", this));
    }
    if (this._starting_precip < 0) {
      errs.push(new ValidationError("starting_precip", "Invalid starting precipitation value for the weather stream.", this));
    }
    if (this._hffmc_hour < -1 || this._hffmc_hour > 23) {
      errs.push(new ValidationError("hffmc_hour", "Invalid starting HFFMC hour for the weather stream.", this));
    }
    if (this.hffmc_method != HFFMCMethod.LAWSON && this.hffmc_method != HFFMCMethod.VAN_WAGNER) {
      errs.push(new ValidationError("hffmc_method", "Invalid HFFMC calculation method for the weather stream.", this));
    }
    if (this._start_time == null) {
      errs.push(new ValidationError("lstart_time", "No start time has been set for the weather stream.", this));
    }
    if (this._end_time == null) {
      errs.push(new ValidationError("lend_time", "No end time has been set for the weather stream.", this));
    }
    return errs;
  }
  
  /**
   * Streams the weather station to a socket.
   * @param builder
   */
  public stream(builder: net.Socket) {
    let tmp = this._id + '|' + this._filename + '|' + this.hffmc_value + '|' + this.hffmc_hour + '|' + this.hffmc_method;
    tmp = tmp + '|' + this.starting_ffmc + '|' + this.starting_dmc + '|' + this.starting_dc + '|' + this.starting_precip;
    tmp = tmp + '|' + this._start_time.toISODate() + '|' + this._end_time.toISODate();
    tmp = tmp + '|' + this.parentId + '|' + this.comments;
    if (this.diurnal_temperature_alpha != 9999) {
      tmp = tmp + '|' + this.diurnal_temperature_alpha + '|' + this.diurnal_temperature_beta + '|' + this.diurnal_temperature_gamma;
      tmp = tmp + '|' + this.diurnal_windspeed_alpha + '|' + this.diurnal_windspeed_beta + '|' + this.diurnal_windspeed_gamma;
    }
    builder.write(WeatherStream.PARAM_WEATHERSTREAM + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

export class WeatherStation {
  private static readonly PARAM_WEATHERSTATION = "weatherstation";
  
  protected static counter = 0;
  
  /**
   * The name of the weather station. The name must be unique amongst a weather station collection.
   */
  private _id: string;
  /**
   * Get the name of the weather station.
   */
  get id(): string {
    return this._id;
  }
  /**
   * Set the name of the weather station. Must be unique amongst the weather station collection. Cannot be null or empty.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set id(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The name of the weather station is not valid");
    }
    this.setName(value);
  }
  /**
   * The location of the weather station (required).
   */
  public location: LatLon;
  /**
   * The weather streams from this weather station.
   */
  public streams = new Array<WeatherStream>();
  /**
   * User comments about the weather station (optional).
   */
  public comments: string = "";
  /**
   * The elevation of the weather station (required).
   */
  public elevation: number = 0;
  
  public getId(): string {
    return this._id;
  }
  
  /**
   * Set the name of the weather station. This name must be unique within
   * the simulation. The name will get a default value when the
   * weather station is constructed but can be overriden with this method.
   */
  public setName(name: string): void {
    this._id = name.replace(/\|/g, "");
  }
  
  public constructor() {
    this._id = "wthrstn" + WeatherStation.counter;
    WeatherStation.counter += 1;
  }
  
  /**
   * Checks to see if all required values are specified.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Look for errors in the weather station.
   * @returns A list of all errors found in the weather station.
   */
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    if (!this._id || this._id.length === 0) {
      errs.push(new ValidationError("id", "No ID has been set for the weather station.", this));
    }
    if (this.location == null) {
      errs.push(new ValidationError("location", "The location of the weather station has not been set.", this));
    }
    let weatherStreamErrs = new Array<ValidationError>();
    for (let i = 0; i < this.streams.length; i++) {
      let wsErr = new ValidationError(i, `Errors found in the weather stream at index ${i}.`, this.streams);
      for (let j = i + 1; j < this.streams.length; j++) {
        if (this.streams[i].id.toUpperCase() === this.streams[j].id.toUpperCase()) {
          let err = new ValidationError("id", "Duplicate weather stream IDs.", this.streams[i]);
          wsErr.addChild(err);
          break;
        }
      }
      this.streams[i].checkValid().forEach(err => {
        wsErr.addChild(err);
      })
      if (wsErr.children.length > 0) {
        weatherStreamErrs.push(wsErr);
      }
    }
    if (weatherStreamErrs.length > 0) {
      let temp = new ValidationError("streams", "Errors found in weather streams.", this);
      weatherStreamErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    return errs;
  }
  
  /**
   * Add a weather stream to the station.
   * @param filename The file location for the streams data. Can either be the actual file path 
   * 				   or the attachment URL returned from {@link WISE#addAttachment}
   * @param hffmc_value The HFFMC value.
   * @param hffmc_hour The hour the HFFMC value was measured. Must be between -1 and 23 inclusive.
   * @param hffmc_method The method to calculate HFFMC.
   * @param starting_ffmc The starting FFMC value.
   * @param starting_dmc The starting DMC value.
   * @param starting_dc The starting DC value.
   * @param starting_precip The starting amount of precipitation.
   * @param start_time The starting time of the weather stream. If a string is used it must be formatted as "YYYY-MM-DD".
   * @param end_time The ending time of the weather stream. If a string is used it must be formatted as "YYYY-MM-DD".
   * @param comments An optional user comment to attach to the weather stream.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set and {@link SocketMsg.skipFileTests} is not set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if the file doesn't exist.
   * @return WeatherStream
   */
  public addWeatherStream(filename: string, hffmc_value: number, hffmc_hour: number, hffmc_method: HFFMCMethod,
                          starting_ffmc: number, starting_dmc: number, starting_dc: number, 
                          starting_precip: number, start_time: string|DateTime, end_time: string|DateTime, comments?: string): WeatherStream {
    let ws = new WeatherStream(this.id);
    if (comments != null) {
      ws.comments = comments;
    }
    ws.filename = filename;
    ws.hffmc_value = hffmc_value;
    ws.hffmc_hour = Math.round(hffmc_hour);
    ws.hffmc_method = hffmc_method;
    ws.starting_ffmc = starting_ffmc;
    ws.starting_dmc = starting_dmc;
    ws.starting_dc = starting_dc;
    ws.starting_precip = starting_precip;
    if (typeof start_time === "string") {
      ws.start_time = start_time;
    }
    else {
      ws.lstart_time = start_time;
    }
    if (typeof end_time === "string") {
      ws.end_time = end_time;
    }
    else {
      ws.lend_time = end_time;
    }
    this.streams.push(ws);
    return ws;
  }
  
  /**
   * Add a weather stream to the station with specified diurnal parameters.
   * @param filename The file location for the streams data. Can either be the actual file path 
   * 				   or the attachment URL returned from {@link WISE#addAttachment}
   * @param hffmc_value The HFFMC value.
   * @param hffmc_hour The hour the HFFMC value was measured. Must be between -1 and 23 inclusive.
   * @param hffmc_method The method to calculate HFFMC.
   * @param starting_ffmc The starting FFMC value.
   * @param starting_dmc The starting DMC value.
   * @param starting_dc The starting DC value.
   * @param starting_precip The starting amount of precipitation.
   * @param start_time The starting time of the weather stream. Must be formatted as "YYYY-MM-DD"
   * @param end_time The ending time of the weather stream. Must be formatted as "YYYY-MM-DD"
   * @param talpha The diurnal alpha temperature parameter.
   * @param tbeta The diurnal alpha temperature parameter.
   * @param tgamma The diurnal gamma temperature parameter.
   * @param wsalpha The diurnal alpha wind speed parameter.
   * @param wsbeta The diurnal beta wind speed parameter.
   * @param wsgamma The diurnal gamma wind speed parameter.
   * @param comments An optional user comment to attach to the weather stream.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set and {@link SocketMsg.skipFileTests} is not set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if the file doesn't exist.
   * @return WeatherStream
   */
  public addWeatherStreamWithDiurnalParameters(filename: string, hffmc_value: number, hffmc_hour: number,
                                               hffmc_method: HFFMCMethod, starting_ffmc: number, starting_dmc: number, starting_dc: number,
                                               starting_precip: number, start_time: string|DateTime, end_time: string|DateTime, talpha: number, tbeta: number,
                                               tgamma: number, wsalpha: number, wsbeta: number, wsgamma: number, comments?: string) {
    let ws = new WeatherStream(this.id);
    if (comments != null) {
      ws.comments = comments;
    }
    ws.filename = filename;
    ws.hffmc_value = hffmc_value;
    ws.hffmc_hour = Math.round(hffmc_hour);
    ws.hffmc_method = hffmc_method;
    ws.starting_ffmc = starting_ffmc;
    ws.starting_dmc = starting_dmc;
    ws.starting_dc = starting_dc;
    ws.starting_precip = starting_precip;
    if (typeof start_time === "string") {
      ws.start_time = start_time;
    }
    else {
      ws.lstart_time = start_time;
    }
    if (typeof end_time === "string") {
      ws.end_time = end_time;
    }
    else {
      ws.lend_time = end_time;
    }
    ws.diurnal_temperature_alpha = talpha;
    ws.diurnal_temperature_beta = tbeta;
    ws.diurnal_temperature_gamma = tgamma;
    ws.diurnal_windspeed_alpha = wsalpha;
    ws.diurnal_windspeed_beta = wsbeta;
    ws.diurnal_windspeed_gamma = wsgamma;
    this.streams.push(ws);
    return ws;
  }
  
  /**
   * Remove a WeatherStream object from the weather grid.
   * @param weatherStream The WeatherStream object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeWeatherStream(weatherStream: WeatherStream): boolean {
    var index = this.streams.indexOf(weatherStream);
    if (index != -1) {
      this.streams.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Streams the weather station to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    let tmp = this._id + '|' + this.location.latitude + '|' + this.location.longitude + '|' + this.elevation + '|' + this.comments;
    builder.write(WeatherStation.PARAM_WEATHERSTATION + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
    
    for (let stream of this.streams) {
      stream.stream(builder);
    }
  }
}

export enum IgnitionType {
  FILE = 0,
  POLYLINE = 1,
  POLYGON = 2,
  POINT = 4
}

interface AttributeEntry {
  key: string;
  value: string|number;
}

/**
 * Information about an ignition input.
 * @author "Travis Redpath"
 */
export class Ignition {
  private static readonly PARAM_IGNITION = "ignition";
  
  protected static counter = 0;
  
  /**
   * The name of the ignition. The name must be unique amongst ignition collections.
   */
  private _id: string;
  /**
   * Get the name of the ignition.
   */
  get id(): string {
    return this._id;
  }
  /**
   * Set the name of the ignition. Must be unique amongst the ignition collection. Cannot be null or empty.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set id(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The name of the ignition is not valid");
    }
    this.setName(value);
  }
  /**
   * User comments about the ignition (optional).
   */
  public comments: string = "";
  /**
   * The ignition start time (required).
   */
  private _startTime: DateTime;
  /**
   * Get the ignition start time as a Luxon DateTime.
   */
  get lStartTime(): DateTime {
    return this._startTime;
  }
  /**
   * Get the ignition start time as an ISO8601 string.
   * @deprecated
   */
  get startTime(): string {
    return this._startTime == null ? "" : this._startTime.toISO();
  }
  /**
   * Set the ignition start time using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lStartTime(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The ignition start time is not valid");
    }
    this._startTime = value;
  }
  /**
   * Set the ignition start time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set startTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The ignition start time is not valid");
    }
    this._startTime = DateTime.fromISO(value);
  }
  /**
   * The type of ignition (required).
   */
  public type: IgnitionType = -1;
  /**
   * The filename associated with this ignition. Only valid if type is FILE.
   */
  private _filename: string = "";
  /**
   * Get the location of the file containing the ignition.
   */
  get filename(): string {
    return this._filename;
  }
  /**
   * Set the location of the file containing the ignition. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set filename(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The ignition file does not exist.");
    }
    this._filename = value;
  }
  /**
   * An array of LatLon describing the ignition. Only valid if type is POLYLINE, POLYGON, or POINT.
   */
  public feature = new Array<LatLon>();
  
  /**
   * A list of attributes for the ignition. Not valid for {@link #filename} types.
   * Valid types for the value are Integer, Long, Double, and String.
   */
  public attributes = new Array<AttributeEntry>();
  
  public getId(): string {
    return this._id;
  }
  
  /**
   * Set the name of the ignition. This name must be unique within
   * the simulation. The name will get a default value when the
   * ignition is constructed but can be overriden with this method.
   */
  public setName(name: string): void {
    this._id = name.replace(/\|/g, "");
  }
  
  public constructor() {
    this._id = "ign" + Ignition.counter;
    Ignition.counter += 1;
  }
  
  /**
   * Add a new point to the ignition shape. Only valid for POLYLINE, POLYGON, or POINT.
   * @param point The point to add to the ignition.
   * @returns The current ignition object so that multiple additions can be chained.
   */
  public addPoint(point: LatLon): Ignition {
    this.feature.push(point);
    return this;
  }
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    if (!this._id || this._id.length === 0) {
      errs.push(new ValidationError("id", "No ID has been set for the ignition.", this));
    }
    if (this._startTime == null) {
      errs.push(new ValidationError("lStartTime", "No start time has been set for the ignition.", this));
    }
    if (this.type == IgnitionType.FILE) {
      if(!SocketMsg.skipFileTests) {
        //the file must be an attachment or a local file
        if (!this._filename.startsWith("attachment:/") && fs.existsSync(this._filename)) {
          errs.push(new ValidationError("filename", "The specified ignition file does not exist.", this));
        }
      }
    }
    else if ((this.type == IgnitionType.POLYLINE || this.type == IgnitionType.POLYGON || this.type == IgnitionType.POINT)) {
      if (this.feature.length == 0) {
        errs.push(new ValidationError("feature", "No locations have been added to the ignition.", this));
      }
    }
    else {
      errs.push(new ValidationError("type", "Invalid ignition type.", this));
    }
    return errs;
  }
  
  /**
   * Streams the ignition to a socket.
   * @param builder
   */
  public stream(builder: net.Socket) {
    let tmp = this._id + '|' + this._startTime.toISO() + '|' + this.comments;
    if (this.type == IgnitionType.FILE) {
      tmp = tmp + '|file|' + this._filename;
    }
    else if (this.type == IgnitionType.POINT) {
      tmp = tmp + '|point';
      for (let p of this.feature) {
        tmp = tmp + '|' + p.latitude + '|' + p.longitude;
      }
    }
    else if (this.type == IgnitionType.POLYGON) {
      tmp = tmp + '|polygon';
      for (let p of this.feature) {
        tmp = tmp + '|' + p.latitude + '|' + p.longitude;
      }
    }
    else if (this.type == IgnitionType.POLYLINE) {
      tmp = tmp + '|polyline';
      for (let p of this.feature) {
        tmp = tmp + '|' + p.latitude + '|' + p.longitude;
      }
    }
    tmp = tmp + "|attr|" + this.attributes.length;
    for (let a of this.attributes) {
      tmp = tmp + "|" + a.key + "|" + a.value;
    }
    builder.write(Ignition.PARAM_IGNITION + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

/**
 * The type of shape that is being used to describe an
 * asset.
 */
export enum AssetShapeType {
  FILE = 0,
  POLYLINE = 1,
  POLYGON = 2,
  POINT = 4
}

/**
 * An asset that can be used to stop a simulation early.
 * @author "Travis Redpath"
 */
export class AssetFile {
  private static readonly PARAM_ASSET_FILE = "asset_file";
  
  protected static counter = 0;
  
  /**
   * The name of the asset. The name must be unique amongst asset file collections.
   */
  private _id: string;
  /**
   * Get the name of the asset.
   */
  get id(): string {
    return this._id;
  }
  /**
   * Set the name of the asset. Must be unique amongst the asset collection. Cannot be null or empty.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set id(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The name of the asset is not valid");
    }
    this.setName(value);
  }
  /**
   * User comments about the asset (optional).
   */
  public comments: string = "";
  /**
   * The type of asset (required).
   */
  public type: AssetShapeType = -1;
  /**
   * The filename associated with this asset. Only valid if type is FILE.
   */
  private _filename: string = "";
  /**
   * Get the location of the file containing the asset.
   */
  get filename(): string {
    return this._filename;
  }
  /**
   * Set the location of the file containing the asset. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set filename(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The asset file does not exist.");
    }
    this._filename = value;
  }
  /**
   * An array of LatLon describing the asset. Only valid if type is POLYLINE, POLYGON, or POINT.
   */
  public feature = new Array<LatLon>();
  /**
   * The buffer size to use for line or point assets. If negative, no buffer will be used.
   */
  public buffer: number = -1.0;
  
  public getId(): string {
    return this._id;
  }
  
  /**
   * Set the name of the asset. This name must be unique within
   * the simulation. The name will get a default value when the
   * asset is constructed but can be overriden with this method.
   */
  public setName(name: string): void {
    this._id = name.replace(/\|/g, "");
  }
  
  public constructor() {
    this._id = "asset" + AssetFile.counter;
    AssetFile.counter += 1;
  }
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the asset.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (!this._id || this._id.length === 0) {
      errs.push(new ValidationError("id", "No ID has been set for the asset.", this));
    }
    if (this.type == AssetShapeType.FILE) {
      if(!SocketMsg.skipFileTests) {
        //the file must be an attachment or a local file
        if (!this._filename.startsWith("attachment:/") && fs.existsSync(this._filename)) {
          errs.push(new ValidationError("filename", "The specified asset file does not exist.", this));
        }
      }
    }
    else if ((this.type == AssetShapeType.POLYLINE || this.type == AssetShapeType.POLYGON || this.type == AssetShapeType.POINT) && this.feature.length == 0) {
      errs.push(new ValidationError("feature", "No locations have been added to the asset.", this));
    }
    else {
      errs.push(new ValidationError("type", "Invalid asset type.", this));
    }
    return errs;
  }
  
  /**
   * Streams the ignition to a socket.
   * @param builder
   */
  public stream(builder: net.Socket) {
    let tmp = this._id + '|' + this.comments + '|' + (+this.type) + '|' + this.buffer;
    if (this.type == AssetShapeType.FILE) {
      tmp = tmp + this._filename;
    }
    else {
      for (let p of this.feature) {
        tmp = tmp + '|' + p.latitude + '|' + p.longitude;
      }
    }
    builder.write(AssetFile.PARAM_ASSET_FILE + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

/**
 * A target to direct simulated weather towards.
 */
export class TargetFile {
  private static readonly PARAM_TARGET_FILE = "target_file";
  
  protected static counter = 0;
  
  /**
   * The name of the target. The name must be unique amongst target file collections.
   */
  private _id: string;
  /**
   * Get the name of the target.
   */
  get id(): string {
    return this._id;
  }
  /**
   * Set the name of the target. Must be unique amongst the target collection. Cannot be null or empty.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set id(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The name of the target is not valid");
    }
    this.setName(value);
  }
  /**
   * User comments about the target (optional).
   */
  public comments: string = "";
  /**
   * The type of target (required).
   */
  public type: AssetShapeType = -1;
  /**
   * The filename associated with this target. Only valid if type is FILE.
   */
  private _filename: string = "";
  /**
   * Get the location of the file containing the target.
   */
  get filename(): string {
    return this._filename;
  }
  /**
   * Set the location of the file containing the target. The file must either be an attachment or exist on the disk (if {@link SocketMsg.skipFileTests} is not set).
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set filename(value: string) {
    if (SocketMsg.inlineThrowOnError && !SocketMsg.skipFileTests && !value.startsWith("attachment:/") && !fs.existsSync(value)) {
      throw new RangeError("The target file does not exist.");
    }
    this._filename = value;
  }
  /**
   * An array of LatLon describing the target. Only valid if type is POLYLINE, POLYGON, or POINT.
   */
  public feature = new Array<LatLon>();
  
  public getId(): string {
    return this._id;
  }
  
  /**
   * Set the name of the target. This name must be unique within
   * the simulation. The name will get a default value when the
   * target is constructed but can be overriden with this method.
   */
  public setName(name: string): void {
    this._id = name.replace(/\|/g, "");
  }
  
  public constructor() {
    this._id = "target" + TargetFile.counter;
    TargetFile.counter += 1;
  }
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the asset.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (!this._id || this._id.length === 0) {
      errs.push(new ValidationError("id", "No ID has been set for the target.", this));
    }
    if (this.type == AssetShapeType.FILE) {
      if(!SocketMsg.skipFileTests) {
        //the file must be an attachment or a local file
        if (!this._filename.startsWith("attachment:/") && fs.existsSync(this._filename)) {
          errs.push(new ValidationError("filename", "The specified target file does not exist.", this));
        }
      }
    }
    else if ((this.type == AssetShapeType.POLYLINE || this.type == AssetShapeType.POLYGON || this.type == AssetShapeType.POINT) && this.feature.length == 0) {
      errs.push(new ValidationError("feature", "No locations have been added to the target.", this));
    }
    else {
      errs.push(new ValidationError("type", "Invalid target type.", this));
    }
    return errs;
  }
  
  /**
   * Streams the ignition to a socket.
   * @param builder
   */
  public stream(builder: net.Socket) {
    let tmp = this._id + '|' + this.comments + '|' + (+this.type);
    if (this.type == AssetShapeType.FILE) {
      tmp = tmp + this._filename;
    }
    else {
      for (let p of this.feature) {
        tmp = tmp + '|' + p.latitude + '|' + p.longitude;
      }
    }
    builder.write(TargetFile.PARAM_TARGET_FILE + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

/**
 * Options for associating an ignition point with a scenario.
 */
export class IgnitionReference {
  /**
   * The ID of the ignition.
   */
  public ignition: string;
  /**
   * Optional sub-scenario building options.
   */
  public polylineIgnitionOptions: PolylineIgnitionOptions;
  /**
   * Optional sub-scenario building options.
   */
  public multiPointIgnitionOptions: MultiPointIgnitionOptions;
  /**
   * Optional sub-scenario building options.
   */
  public singlePointIgnitionOptions: SinglePointIgnitionOptions;
  
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the ignition reference.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    
    if (this.ignition == null || this.ignition.length == 0) {
      errs.push(new ValidationError("ignition", "No ignition reference was set.", this));
    }
    let count = 0;
    if (this.polylineIgnitionOptions != null) {
      count++;
      let optionsErrs = this.polylineIgnitionOptions.checkValid();
      if (optionsErrs.length > 0) {
        let temp = new ValidationError("polylineIgnitionOptions", "Errors in sub-scenario options for polyline ignitions.", this);
        optionsErrs.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
    }
    if (this.multiPointIgnitionOptions != null) {
      count++;
      let optionsErrs = this.multiPointIgnitionOptions.checkValid();
      if (optionsErrs.length > 0) {
        let temp = new ValidationError("multiPointIgnitionOptions", "Errors in sub-scenario options for multi-point ignitions.", this);
        optionsErrs.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
    }
    if (this.singlePointIgnitionOptions != null) {
      count++;
      let optionsErrs = this.singlePointIgnitionOptions.checkValid();
      if (optionsErrs.length > 0) {
        let temp = new ValidationError("singlePointIgnitionOptions", "Errors in sub-scenario options for single point ignitions.", this);
        optionsErrs.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
    }
    if (count > 0) {
      errs.push(new ValidationError("", "More than one sub-scenario type has been specified.", this));
    }
    
    return errs;
  }
}

export class PolylineIgnitionOptions {
  /**
   * A name for the sub-scenario
   */
  public name: string;
  /**
   * The spacing between points (expressed in meters)
   */
  public pointSpacing: number = 0;
  /**
   * Index of the polyline to use, or -1 to use all polylines.
   */
  public polyIndex: number = -1;
  /**
   * Index of the point ignition to use in the specified polyline(s), or -1 to use all points.
   */
  public pointIndex: number = -1;
  
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    
    if (this.name == null || this.name.length == 0) {
      errs.push(new ValidationError("name", "No name has been set for the sub-scenario.", this));
    }
    
    return errs;
  }
}
export class MultiPointIgnitionOptions {
  /**
   * A name for the sub-scenario.
   */
  public name: string;
  /**
   * Index of the point ignition to use in the specified polyline(s), or -1 to use all points.
   */
  public pointIndex: number = -1;
  
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    
    if (this.name == null || this.name.length == 0) {
      errs.push(new ValidationError("name", "No name has been set for the sub-scenario.", this));
    }
    
    return errs;
  }
}
export class SinglePointIgnitionOptions {
  /**
   * A name for the sub-scenario.
   */
  public name: string;
  
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    
    if (this.name == null || this.name.length == 0) {
      errs.push(new ValidationError("name", "No name has been set for the sub-scenario.", this));
    }
    
    return errs;
  }
}

/**
 * The local time to calculate the start and stop time for burning
 * conditions based off.
 */
export enum BurningConditionRelative {
  /**
   * Compute start/stop times based off of local midnight.
   * This is the default and the original behavior.
   */
  LOCAL_MIDNIGHT = 0,
  /**
   * Compute start/stop times based off of local noon.
   * Times may be negative for this type.
   */
  LOCAL_NOON = 1,
  /**
   * Compute start/stop times based off of local sunrise/sunset.
   */
  SUN_RISE_SET = 2
}

/**
 * A condition for burning.
 * @author "Travis Redpath"
 */
export class BurningConditions {
  /**
   * The date the burning condition is in effect on (required).
   */
  private _date: DateTime;
  /**
   * Get the burning condition date as a Luxon DateTime.
   */
  get lDate(): DateTime {
    return this._date;
  }
  /**
   * Get the burning condition date as an ISO8601 string.
   * @deprecated
   */
  get date(): string {
    return this._date == null ? "" : this._date.toISODate();
  }
  /**
   * Set the burning condition date using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lDate(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The ignition start time is not valid");
    }
    this._date = value;
  }
  /**
   * Set the burning condition date using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set date(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The burning condition date is not valid");
    }
    this._date = DateTime.fromISO(value);
  }
  /**
   * The time of day that the burning condition starts to take effect (optional).
   */
  public startTime: Duration|null = null;
  /**
   * The time of day that the burning condition stops (optional).
   */
  public endTime: Duration|null = null;
  /**
   * The minimum FWI value that will allow burning (optional).
   */
  private _fwiGreater: number = 0;
  /**
   * Get the minimum FWI value that will allow burning.
   */
  get fwiGreater(): number {
    return this._fwiGreater;
  }
  /**
   * Set the minimum FWI value that will allow burning. Must be greater than or equal to 0.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set fwiGreater(value: number) {
    if (SocketMsg.inlineThrowOnError && value != null && value < 0) {
      throw new RangeError("The minimum FWI value that will allow burning is not valid.");
    }
    this._fwiGreater = value;
  }
  /**
   * The minimum wind speed that will allow burning (optional).
   */
  private _wsGreater: number = 0;
  /**
   * Get the minimum wind speed that will allow burning.
   */
  get wsGreater(): number {
    return this._wsGreater;
  }
  /**
   * Set the minimum wind speed that will allow burning. Must be in [0, 200].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set wsGreater(value: number) {
    if (SocketMsg.inlineThrowOnError && value != null && (value < 0 || value > 200)) {
      throw new RangeError("The minimum wind speed that will allow burning is not valid.");
    }
    this._wsGreater = value;
  }
  /**
   * The maximum relative humidity that will allow burning (optional).
   */
  private _rhLess: number = 100;
  /**
   * Get the maximum relative humidity that will allow burning.
   */
  get rhLess(): number {
    return this._rhLess;
  }
  /**
   * Set the maximum relative humidity that will allow burning. Must be in [0, 100].
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set rhLess(value: number) {
    if (SocketMsg.inlineThrowOnError && value != null && (value < 0 || value > 100)) {
      throw new RangeError("The maximum relative humidity that will allow burning is not valid.");
    }
    this._rhLess = value;
  }
  /**
   * The minimum ISI that will allow burning (optional).
   */
  private _isiGreater: number = 0;
  /**
   * Get the minimum ISI that will allow burning.
   */
  get isiGreater(): number {
    return this._isiGreater;
  }
  /**
   * Set the minimum ISI that will allow burning. Must be greater than or equal to 0.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set isiGreater(value: number) {
    if (SocketMsg.inlineThrowOnError && value != null && value < 0) {
      throw new RangeError("The minimum ISI that will allow burning is not valid.");
    }
    this._isiGreater = value;
  }
  
  /**
   * The local time to calculate the start time for burning
   * conditions based off.
   */
  public startTimeOffset = BurningConditionRelative.LOCAL_MIDNIGHT;
  
  /**
   * The local time to calculate the stop time for burning
   * conditions based off.
   */
  public endTimeOffset = BurningConditionRelative.LOCAL_MIDNIGHT;
  
  public constructor() {
    this.startTime = Duration.createTime(0, 0, 0, false);
    this.endTime = Duration.createTime(23, 59, 59, false);
  }
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the burn condition.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this._date == null) {
      errs.push(new ValidationError("date", "No date was set to apply the burn conditions to.", this));
    }
    let startReady = true;
    if (this.startTime == null) {
      startReady = false;
      errs.push(new ValidationError("startTime", "No start time of day has been set for the burn condition.", this));
    }
    else if (!this.startTime.isValid() || this.startTime.isNegative || this.startTime.years > 0 || this.startTime.days > 0 || this.startTime.hours > 23) {
      startReady = false;
      errs.push(new ValidationError("startTime", "The start time of day for the burn condition is invalid.", this));
    }
    if (this.endTime == null) {
      errs.push(new ValidationError("endTime", "No end time of day has been set for the burn condition.", this));
    }
    else if (!this.endTime.isValid() || this.endTime.isNegative || Duration.createTime(24, 0, 0, false).isLessThan(this.endTime)) {
      errs.push(new ValidationError("endTime", "The end time of day for the burn condition is invalid.", this));
    }
    else if (startReady && this.startTime && this.endTime.isLessThan(this.startTime)) {
      errs.push(new ValidationError("endTime", "The end time of day for the burn condition is before the start time of day.", this));
    }
    if (this._fwiGreater < 0) {
      errs.push(new ValidationError("fwiGreater", "The specified minimum FWI required for burning is invalid.", this));
    }
    if (this._wsGreater < 0 || this._wsGreater > 200) {
      errs.push(new ValidationError("wsGreater", "The specified minimum wind speed required for burning is invalid.", this));
    }
    if (this._rhLess < 0 || this._rhLess > 100) {
      errs.push(new ValidationError("rhLess", "The specified maximum relative humidity required for burning is invalid.", this));
    }
    if (this._isiGreater < 0) {
      errs.push(new ValidationError("isiGreater", "The specified minimum ISI required for burning is invalid.", this));
    }
    return errs;
  }
}

export class LayerInfoOptions {
  public subNames: Array<string> = new Array<string>();
}

export class LayerInfo {
  /**
   * The name of the grid file to add.
   */
  protected name: string = "";
  /**
   * The layers index.
   */
  public index: number = -1;
  /**
   * Options for the layer when creating sub-scenarios.
   */
  public options: LayerInfoOptions|null = null;
  
  public getName(): string {
    return this.name;
  }
  
  public constructor(id: string) {
    this.name = id;
  }
  
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the layer reference.
   * @returns A list of all errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this.name == null || this.name.length == 0) {
      errs.push(new ValidationError("name", "No layer reference has been set.", this));
    }
    if (this.index < 0) {
      errs.push(new ValidationError("index", "The layer index has not been set.", this));
    }
    return errs;
  }
}

/**
 * A reference to an asset that has been added to a scenario. Contains options
 * for how to handle the asset.
 */
export class AssetReference {
  
  /**
   * The name of the asset that was added.
   */
  protected name: string = "";
  /**
   * The affect the asset will have on the simulation.
   */
  public operation: AssetOperation = AssetOperation.STOP_AFTER_ALL;
  /**
   * The number of assets that need to be reached before the simulation will stop. Only valid if operation is AssetOperation::STOP_AFTER_X.
   */
  public collisionCount: number = -1;
  
  public getName(): string {
    return this.name;
  }
  
  public constructor(id: string) {
    this.name = id;
  }
  
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    
    if (this.name == null || this.name.length == 0) {
      errs.push(new ValidationError("name", "No aseet reference has been set.", this));
    }
    if (this.operation == AssetOperation.STOP_AFTER_X && this.collisionCount < 1) {
      errs.push(new ValidationError("collisionCount", "The collision count has not been set when the asset operation is to stop after reaching X assets.", this));
    }
    
    return errs;
  }
}

/**
 * A reference to a target that has been added to a scenario. Contains options
 * for how to handle the target.
 */
export class TargetReference {
  
  /**
   * The name of the target that was added.
   */
  protected name: string = "";
  /**
   * An index of a geometry within the shape to use as the target.
   */
  public geometryIndex: number = -1;
  /**
   * An index of a point within the shape to use as the target.
   */
  public pointIndex: number = -1;
  
  public getName(): string {
    return this.name;
  }
  
  public constructor(id: string) {
    this.name = id;
  }
  
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    
    if (this.name == null || this.name.length == 0) {
      errs.push(new ValidationError("name", "No target reference has been set.", this));
    }
    
    return errs;
  }
}

/**
 * Settings to modify W.I.S.E. behaviour at the end of every timestep.
 * @author "Travis Redpath"
 */
export class TimestepSettings {
  private static readonly PARAM_EMIT_STATISTIC = "mng_statistic";
  
  private statistics = new Array<GlobalStatistics>();
  
  /**
   * The amount to discritize the existing grid to (optional).
   * Will only be applied to statistics that require a discretization parameter.
   * Must be in [1,1001].
   */
  public discretize: number|null = null;
  
  /**
   * Check to see if a global statistic if valid to be used as a timestep setting.
   * @param stat True if the input statistic if valid for timestep settings.
   */
  private static validateInput(stat: GlobalStatistics): boolean {
    if (stat != GlobalStatistics.TOTAL_BURN_AREA && stat != GlobalStatistics.TOTAL_PERIMETER &&
        stat != GlobalStatistics.EXTERIOR_PERIMETER && stat != GlobalStatistics.ACTIVE_PERIMETER && stat != GlobalStatistics.TOTAL_PERIMETER_CHANGE &&
        stat != GlobalStatistics.TOTAL_PERIMETER_GROWTH_RATE && stat != GlobalStatistics.EXTERIOR_PERIMETER_CHANGE && stat != GlobalStatistics.EXTERIOR_PERIMETER_GROWTH_RATE &&
        stat != GlobalStatistics.ACTIVE_PERIMETER_CHANGE && stat != GlobalStatistics.ACTIVE_PERIMETER_GROWTH_RATE && stat != GlobalStatistics.AREA_CHANGE &&
        stat != GlobalStatistics.AREA_GROWTH_RATE && stat != GlobalStatistics.NUM_VERTICES && stat != GlobalStatistics.NUM_ACTIVE_VERTICES &&
        stat != GlobalStatistics.CUMULATIVE_ACTIVE_VERTICES && stat != GlobalStatistics.CUMULATIVE_VERTICES && stat != GlobalStatistics.NUM_FRONTS &&
        stat != GlobalStatistics.NUM_ACTIVE_FRONTS && stat != GlobalStatistics.MAX_ROS && stat != GlobalStatistics.MAX_CFB && stat != GlobalStatistics.MAX_CFC &&
        stat != GlobalStatistics.MAX_SFC && stat != GlobalStatistics.MAX_TFC && stat != GlobalStatistics.MAX_FI && stat != GlobalStatistics.MAX_FL &&
        stat != GlobalStatistics.TICKS && stat != GlobalStatistics.PROCESSING_TIME && stat != GlobalStatistics.GROWTH_TIME &&
        stat != GlobalStatistics.DATE_TIME && stat != GlobalStatistics.SCENARIO_NAME && stat != GlobalStatistics.HFI && stat != GlobalStatistics.HCFB) {
      return false;
    }
    return true;
  }
  
  /**
   * Add a statistic to output.
   * @param stat The name of the statistic to add.
   * @returns The added statistic, or null if an invalid statistic was passed.
   */
  public addStatistic(stat: GlobalStatistics.TOTAL_BURN_AREA | GlobalStatistics.TOTAL_PERIMETER |
                            GlobalStatistics.EXTERIOR_PERIMETER | GlobalStatistics.ACTIVE_PERIMETER | GlobalStatistics.TOTAL_PERIMETER_CHANGE |
                            GlobalStatistics.TOTAL_PERIMETER_GROWTH_RATE | GlobalStatistics.EXTERIOR_PERIMETER_CHANGE | GlobalStatistics.EXTERIOR_PERIMETER_GROWTH_RATE |
                            GlobalStatistics.ACTIVE_PERIMETER_CHANGE | GlobalStatistics.ACTIVE_PERIMETER_GROWTH_RATE | GlobalStatistics.AREA_CHANGE |
                            GlobalStatistics.AREA_GROWTH_RATE | GlobalStatistics.NUM_VERTICES | GlobalStatistics.NUM_ACTIVE_VERTICES |
                            GlobalStatistics.CUMULATIVE_ACTIVE_VERTICES | GlobalStatistics.CUMULATIVE_VERTICES | GlobalStatistics.NUM_FRONTS |
                            GlobalStatistics.NUM_ACTIVE_FRONTS | GlobalStatistics.MAX_ROS | GlobalStatistics.MAX_CFB | GlobalStatistics.MAX_CFC |
                            GlobalStatistics.MAX_SFC | GlobalStatistics.MAX_TFC | GlobalStatistics.MAX_FI | GlobalStatistics.MAX_FL |
                            GlobalStatistics.TICKS | GlobalStatistics.PROCESSING_TIME | GlobalStatistics.GROWTH_TIME |
                            GlobalStatistics.DATE_TIME | GlobalStatistics.SCENARIO_NAME | GlobalStatistics.HFI | GlobalStatistics.HCFB): GlobalStatistics|null {
    if (!TimestepSettings.validateInput(stat)) {
      return null;
    }
    this.statistics.push(stat);
    return stat;
  }
  
  /**
   * Remove a statistic string from the statistics.
   * @param statistic The statistic string to remove
   * @returns A boolean indicating if the string was found and removed
   */
  public removeStatistic(statistic: GlobalStatistics): boolean {
    var index = this.statistics.indexOf(statistic);
    if (index != -1) {
      this.statistics.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Find all errors that may exist in the timestep settings.
   * @returns A list of all errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    let statErrs = new Array<ValidationError>();
    for (let i = 0; i < this.statistics.length; i++) {
      if (!TimestepSettings.validateInput(this.statistics[i])) {
        let temp = new ValidationError(i, `Invalid timestep setting output found at ${i}.`, this.statistics);
        statErrs.push(temp);
      }
    }
    if (statErrs.length > 0) {
      let temp = new ValidationError("statistics", "Invalid timestep settings found.", this);
      statErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    if (this.discretize != null && (this.discretize < 1 || this.discretize > 1000)) {
      errs.push(new ValidationError("discritize", "The discritization must be an integer greater than 0 and less than 1001.", this));
    }
    
    return errs;
  }
  
  /**
   * Streams the settings to a socket.
   * @param builder
   */
  public stream(builder: net.Socket) {
    if (this.discretize != null) {
      builder.write(TimestepSettings.PARAM_EMIT_STATISTIC + SocketMsg.NEWLINE);
      builder.write(`d|${this.discretize}${SocketMsg.NEWLINE}`)
    }
    this.statistics.forEach(element => {
      builder.write(TimestepSettings.PARAM_EMIT_STATISTIC + SocketMsg.NEWLINE);
      builder.write(element + SocketMsg.NEWLINE);
    });
  }
}

/**
 * Options for creating sub-scenarios when adding weather streams to
 * a scenario.
 */
export class StreamOptions {
  /**
   * The name of the sub-scenario that will be built using these options.
   */
  public name: string = "";
  /**
   * An override for the scenario start time.
   */
  private _startTime: DateTime|null = null;
  /**
   * Get the override for the weather stream start time as a Luxon DateTime.
   */
  get lStartTime(): DateTime|null {
    return this._startTime;
  }
  /**
   * Get the override for the weather stream start time as an ISO8601 string.
   * @deprecated
   */
  get startTime(): string {
    return this._startTime == null ? "" : this._startTime.toISODate();
  }
  /**
   * Set the override for the weather stream start date using a Luxon DateTime. Cannot be null. Only the date component will be used.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lStartTime(value: DateTime|null) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The override for the weather stream start date is not valid");
    }
    this._startTime = value;
  }
  /**
   * Set the override for the weather stream start date using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set startTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The override for the weather stream start date is not valid");
    }
    this._startTime = DateTime.fromISO(value);
  }
  /**
   * An override for the scenario end time.
   */
  private _endTime: DateTime|null = null;
  /**
   * Get the override for the weather stream end time as a Luxon DateTime.
   */
  get lEndTime(): DateTime|null {
    return this._endTime;
  }
  /**
   * Get the override for the weather stream end time as an ISO8601 string.
   * @deprecated
   */
  get endTime(): string {
    return this._endTime == null ? "" : this._endTime.toISODate();
  }
  /**
   * Set the override for the weather stream end date using a Luxon DateTime. Cannot be null. Only the date component will be used.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lEndTime(value: DateTime|null) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The override for the weather stream end date is not valid");
    }
    this._endTime = value;
  }
  /**
   * Set the override for the weather stream end date using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set endTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The override for the weather stream end date is not valid");
    }
    this._endTime = DateTime.fromISO(value);
  }
  /**
   * An override for the ignition start time for any ignitions attached
   * to this sub-scnario. Must be formatted as ISO-8601.
   */
  private _ignitionTime: DateTime|null = null;
  /**
   * Get the override for the ignition start time as a Luxon DateTime.
   */
  get lIgnitionTime(): DateTime|null {
    return this._ignitionTime;
  }
  /**
   * Get the override for the ignition start time as an ISO8601 string.
   * @deprecated
   */
  get ignitionTime(): string {
    return this._ignitionTime == null ? "" : this._ignitionTime.toISO();
  }
  /**
   * Set the override for the ignition start date using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lIgnitionTime(value: DateTime|null) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The override for the ignition start time is not valid");
    }
    this._ignitionTime = value;
  }
  /**
   * Set the override for the ignition start time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set ignitionTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The override for the ignition start time is not valid");
    }
    this._ignitionTime = DateTime.fromISO(value);
  }
  
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the stream sub-scenario options.
   * @returns A list of all errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this.name == null) {
      errs.push(new ValidationError("name", "The sub-scenario name cannot be null.", this));
    }
    
    return errs;
  }
}

/**
 * A reference to a weather stream/station used by a scenario.
 */
export class StationStream {
  /**
   * The name of the weather station.
   */
  public station: string;
  /**
   * The name of the weather stream.
   */
  public stream: string;
  /**
   * Is this the primary stream attached to the scenario.
   */
  public primaryStream: boolean;
  /**
   * Optional settings that determine how sub-scenarios will
   * be created if multiple weather streams are referenced.
   */
  public streamOptions: StreamOptions|null = null;
  
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the weather stream reference.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this.station == null || this.station.length == 0) {
      errs.push(new ValidationError("station", "No weather station has been set on the weather stream reference.", this));
    }
    if (this.stream == null || this.stream.length == 0) {
      errs.push(new ValidationError("stream", "No weather stream has been set on the weather stream reference.", this));
    }
    if (this.streamOptions != null) {
      let streamErrs = this.streamOptions.checkValid();
      if (streamErrs.length > 0) {
        let temp = new ValidationError("streamOptions", "Errors found in stream sub-scenario options.", this);
        streamErrs.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
    }
    return errs;
  }
}

/**
 * A threshold for a stop modelling condition.
 */
export class StopModellingThreshold {
  public threshold: number|null = null;
  
  public duration: Duration|null = null;
  
  public isValid(): boolean {
    return this.threshold != null && this.duration != null && this.duration.isValid();
  }
}

/**
 * Conditions that will stop a fire from simulating before the end time has been reached.
 */
export class StopModellingOptions {
  private static readonly PARAM_STOPMODELLING = "stop_modelling";
  
  public responseTime: DateTime|null = null;
  
  public fi90: StopModellingThreshold|null = null;
  
  public fi95: StopModellingThreshold|null = null;
  
  public fi100: StopModellingThreshold|null = null;
  
  public rh: StopModellingThreshold|null = null;
  
  public precipitation: StopModellingThreshold|null = null;
  
  /**
   * Streams the scenario to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    let tmp = '';
    if (this.responseTime === null) {
      tmp = '0';
    }
    else {
      tmp = this.responseTime.toISO();
    }
    if (this.fi90 !== null && this.fi90.isValid()) {
      tmp = tmp + `|${this.fi90.threshold}|${this.fi90.duration!.toString()}`;
    }
    else {
      tmp = tmp + '|null';
    }
    if (this.fi95 !== null && this.fi95.isValid()) {
      tmp = tmp + `|${this.fi95.threshold}|${this.fi95.duration!.toString()}`;
    }
    else {
      tmp = tmp + '|null';
    }
    if (this.fi100 !== null && this.fi100.isValid()) {
      tmp = tmp + `|${this.fi100.threshold}|${this.fi100.duration!.toString()}`;
    }
    else {
      tmp = tmp + '|null';
    }
    if (this.rh !== null && this.rh.isValid()) {
      tmp = tmp + `|${this.rh.threshold}|${this.rh.duration!.toString()}`;
    }
    else {
      tmp = tmp + '|null';
    }
    if (this.precipitation !== null && this.precipitation.isValid()) {
      tmp = tmp + `|${this.precipitation.threshold}|${this.precipitation.duration!.toString()}`;
    }
    else {
      tmp = tmp + '|null';
    }
  }
}

/**
 * A simulation scenario.
 * @author "Travis Redpath"
 */
export class Scenario {
  private static readonly PARAM_SCENARIO_BEGIN = "scenariostart";
  private static readonly PARAM_SCENARIO_END = "scenarioend";
  private static readonly PARAM_SCENARIONAME = "scenarioname";
  private static readonly PARAM_DISPLAY_INTERVAL = "displayinterval";
  private static readonly PARAM_COMMENTS = "comments";
  private static readonly PARAM_STARTTIME = "starttime";
  private static readonly PARAM_ENDTIME = "endtime";
  private static readonly PARAM_BURNINGCONDITION = "burningcondition";
  private static readonly PARAM_VECTOR_REF = "vectorref";
  private static readonly PARAM_STREAM_REF = "streamref";
  private static readonly PARAM_IGNITION_REF = "ignitionref";
  private static readonly PARAM_LAYER_INFO = "layerinfo";
  private static readonly PARAM_PRIMARY_STREAM = "primarystream";
  private static readonly PARAM_SCENARIO_TO_COPY = "scenariotocopy";
  private static readonly PARAM_ASSET_REF = "asset_ref";
  private static readonly PARAM_WIND_TARGET_REF = "wind_target_ref";
  private static readonly PARAM_VECTOR_TARGET_REF = "vector_target_ref";
  
  protected static counter = 0;
  protected isCopy = false;
  
  /**
   * The name of the scenario. The name must be unique amongst the scenarios.
   */
  private _id: string;
  /**
   * Get the name of the scenario.
   */
  get id(): string {
    return this._id;
  }
  /**
   * Set the name of the scenario. Must be unique amongst the scenario collection. Cannot be null or empty.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set id(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The name of the scenario is not valid");
    }
    this.setName(value);
  }
  /**
   * The scenario start time (required). Must be formatted as 'YYYY-MM-DDThh:mm:ss'.
   */
  private _startTime: DateTime;
  /**
   * Get the scenario start time as a Luxon DateTime.
   */
  get lStartTime(): DateTime {
    return this._startTime;
  }
  /**
   * Get the scenario start time as an ISO8601 string.
   * @deprecated
   */
  get startTime(): string {
    return this._startTime == null ? "" : this._startTime.toISO();
  }
  /**
   * Set the scenario start time using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lStartTime(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The scenario start time is not valid");
    }
    this._startTime = value;
  }
  /**
   * Set the scenario start time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set startTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The scenario start time is not valid");
    }
    this._startTime = DateTime.fromISO(value);
  }
  /**
   * The scenario end time (required).
   */
  private _endTime: DateTime;
  /**
   * Get the scenario end time as a Luxon DateTime.
   */
  get lEndTime(): DateTime {
    return this._endTime;
  }
  /**
   * Get the scenario end time as an ISO8601 string.
   * @deprecated
   */
  get endTime(): string {
    return this._endTime == null ? "" : this._endTime.toISO();
  }
  /**
   * Set the scenario end time using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lEndTime(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The scenario end time is not valid");
    }
    this._endTime = value;
  }
  /**
   * Set the scenario end time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set endTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The scenario end time is not valid");
    }
    this._endTime = DateTime.fromISO(value);
  }
  /**
   * The scenarios display interval (required).
   */
  public displayInterval: Duration;
  /**
   * User comments about the scenario (optional).
   */
  public comments: string = "";
  /**
   * The FGM option values.
   */
  public fgmOptions: FGMOptions;
  /**
   * The FBP option values.
   */
  public fbpOptions: FBPOptions;
  /**
   * The FMC option values.
   */
  public fmcOptions: FMCOptions;
  /**
   * The FWI option values.
   */
  public fwiOptions: FWIOptions;
  /**
   * 
   */
  public stationStreams = new Array<StationStream>();
  /**
   * A set of burning conditions.
   */
  public burningConditions = new Array<BurningConditions>();
  /**
   * A list of vectors used by this scenario.
   */
  public vectorInfo = new Array<string>();
  /**
   * A list of ignitions used by this scenario.
   */
  public ignitionInfo = new Array<IgnitionReference>();
  /**
   * A list of grids used by the scenario. The list contains an index value that defines the order of the layers.
   */
  public layerInfo = new Array<LayerInfo>();
  /**
   * A list of assets used by this scenario. Assets will be used to end simulations early when a firefront
   * reaches the shape.
   */
  public assetFiles = new Array<AssetReference>();
  /**
   * A target used by this scenario to modify the wind direction.
   */
  public windTargetFile: TargetReference|null = null;
  /**
   * A target used by this scenario to modify the vector behaviour.
   */
  public vectorTargetFile: TargetReference|null = null;
  /**
   * Conditions that will be used to end the simulation early.
   */
  public stopModellingOptions: StopModellingOptions|null = null;
  /**
   * The name of the scenario that will be copied.
   */
  protected scenToCopy: string = "";
  
  public getId(): string {
    return this._id;
  }
  
  /**
   * Set the name of the scenario. This name must be unique within
   * the simulation. The name will get a default value when the
   * scenario is constructed but can be overriden with this method.
   */
  public setName(name: string): void {
    this._id = name.replace(/\|/g, "");
  }
  
  public constructor() {
    this._id = "scen" + Scenario.counter;
    Scenario.counter += 1;
    this.displayInterval = Duration.createTime(1, 0, 0, false);
    this.fgmOptions = new FGMOptions();
    this.fbpOptions = new FBPOptions();
    this.fmcOptions = new FMCOptions();
    this.fwiOptions = new FWIOptions();
  }
  
  public makeCopy(toCopy: Scenario) {
    this.isCopy = true;
    this.scenToCopy = toCopy.getId();
  }
  
  /**
   * 
   * @param date The date that the condition is valid on. Must be formatted as 'YYYY-MM-DD'.
   * @param startTime The starting hour. Must be between 0 and 23 inclusive.
   * @param endTime The ending hour. Must be between 1 and 24 inclusive.
   * @param fwiGreater The minimum FWI value that will allow burning.
   * @param wsGreater The minimum wind speed that will allow burning.
   * @param rhLess The maximum relative humidity that will allow burning (as a percent [0-100]).
   * @param isiGreater The minimum ISI that will allow burning.
   */
  public addBurningCondition(date: string|DateTime, startTime: number, endTime: number, fwiGreater: number, wsGreater: number, rhLess: number, isiGreater: number): BurningConditions {
    let bc = new BurningConditions();
    if (typeof date === "string") {
      bc.date = date;
    }
    else {
      bc.lDate = date;
    }
    bc.startTime = Duration.createTime(startTime, 0, 0, false);
    if (endTime > 23) {
      bc.endTime = Duration.createDateTime(0, 0, 1, endTime - 24, 0, 0, false);
    }
    else {
      bc.endTime = Duration.createTime(endTime, 0, 0, false);
    }
    bc.fwiGreater = fwiGreater;
    bc.rhLess = rhLess;
    bc.wsGreater = wsGreater;
    bc.isiGreater = isiGreater;
    this.burningConditions.push(bc);
    return bc;
  }
  
  /**
   * Remove a BurningConditions object from the burning conditions.
   * @param burningCondition The BurningConditions object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeBurningCondition(burningCondition: BurningConditions): boolean {
    var index = this.burningConditions.indexOf(burningCondition);
    if (index != -1) {
      this.burningConditions.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Set the FGM options.
   * @param maxAccTS The maximum time step during acceleration.
   * @param distRes The distance resolution.
   * @param perimRes The perimeter resolution.
   * @param minimumSpreadingRos Minimum Spreading ROS.
   * @param stopAtGridEnd Whether to stop the fire spread when the simulated fire reaches the boundary of the grid data.
   * @param breaching Whether breaching is turned on or off.
   * @param dynamicSpatialThreshold Whether using the dynamic spatial threshold algorithm is turned on or off.
   * @param spotting Whether the spotting model should be activated.
   * @param purgeNonDisplayable Whether internal/hidden time steps are retained.
   * @param growthPercentileApplied Whether the growth percentile value is applied.
   * @param growthPercentile Growth percentile, to apply to specific fuel types.
   */
  public setFgmOptions(maxAccTS: Duration, distRes: number, perimRes: number, minimumSpreadingRos: number,
                       stopAtGridEnd: boolean, breaching: boolean, dynamicSpatialThreshold: boolean, spotting: boolean,
                       purgeNonDisplayable: boolean, growthPercentileApplied: boolean, growthPercentile: number): void {
    this.fgmOptions.maxAccTS = maxAccTS;
    this.fgmOptions.distRes = distRes;
    this.fgmOptions.perimRes = perimRes;
    this.fgmOptions.minimumSpreadingROS = minimumSpreadingRos;
    this.fgmOptions.stopAtGridEnd = stopAtGridEnd;
    this.fgmOptions.breaching = breaching;
    this.fgmOptions.dynamicSpatialThreshold = dynamicSpatialThreshold;
    this.fgmOptions.spotting = spotting;
    this.fgmOptions.purgeNonDisplayable = purgeNonDisplayable;
    this.fgmOptions.growthPercentileApplied = growthPercentileApplied;
    this.fgmOptions.growthPercentile = growthPercentile;
  }
  
  /**
   * Clears the FGM options.
   */
  public clearFgmOptions(): void {
    this.fgmOptions.maxAccTS = null;
    this.fgmOptions.distRes = null;
    this.fgmOptions.perimRes = null;
    this.fgmOptions.minimumSpreadingROS = null;
    this.fgmOptions.stopAtGridEnd = true;
    this.fgmOptions.breaching = false;
    this.fgmOptions.dynamicSpatialThreshold = null;
    this.fgmOptions.spotting = null;
    this.fgmOptions.purgeNonDisplayable = null;
    this.fgmOptions.growthPercentileApplied = null;
    this.fgmOptions.growthPercentile = null;
  }
  
  /**
   * How much to nudge ignitions to perform probabilistic analyses on ignition location and start time.
   * Primarily used when ignition information is not 100% reliable.
   * @param dx How much to nudge ignitions to perform probabilistic analyses on ignition location.
   * @param dy How much to nudge ignitions to perform probabilistic analyses on ignition location.
   * @param dt How much to nudge ignitions to perform probabilistic analyses on ignition location and start time.
   */
  public setProbabilisticValues(dx: number, dy: number, dt: Duration): void {
    this.fgmOptions.dx = dx;
    this.fgmOptions.dy = dy;
    this.fgmOptions.dt = dt;
  }
  
  /**
   * Clears the nudge to ignitions to perform probabilistic analyses on ignition location and start time.
   */
  public clearProbabilisticValues(): void {
    this.fgmOptions.dx = null;
    this.fgmOptions.dy = null;
    this.fgmOptions.dt = null;
  }
  
  /**
   * Set the FBP options.
   * @param terrainEffect Use terrain effect.
   * @param windEffect Use wind effect.
   */
  public setFbpOptions(terrainEffect: boolean, windEffect: boolean): void {
    this.fbpOptions.terrainEffect = terrainEffect;
    this.fbpOptions.windEffect = windEffect;
  }
  
  /**
   * Clear the FBP options.
   */
  public clearFbpOptions(): void {
    this.fbpOptions.terrainEffect = null;
    this.fbpOptions.windEffect = null;
  }
  
  /**
   * Set the FMC options.
   * @param perOverrideVal The value for the FMC (%) override. Use -1 for no override.
   * @param nodataElev The elevation where NODATA or no grid exists.
   * @param terrain
   * @param accurateLocation No longer used, left for compatibility.
   */
  public setFmcOptions(perOverrideVal: number, nodataElev: number, terrain: boolean, accurateLocation: boolean): void {
    this.fmcOptions.perOverride = perOverrideVal;
    this.fmcOptions.nodataElev = nodataElev;
    this.fmcOptions.terrain = terrain;
  }
  
  /**
   * Clears the FMC options.
   */
  public clearFmcOptions(): void {
    this.fmcOptions.perOverride = -1;
    this.fmcOptions.nodataElev = -9999;
    this.fmcOptions.terrain = null;
  }
  
  /**
   * Set the FWI options.
   * @param fwiSpacInterp Apply spatial interpolation to FWI values.
   * @param fwiFromSpacWeather Calculate FWI values from temporally interpolated weather.
   * @param historyOnEffectedFWI Apply history to FWI values affected by patches, grids, etc..
   * @param burningConditionsOn Use burning conditions.
   * @param fwiTemporalInterp Apply spatial interpolation to FWI values.
   */
  public setFwiOptions(fwiSpacInterp: boolean, fwiFromSpacWeather: boolean,
                       historyOnEffectedFWI: boolean, burningConditionsOn: boolean, fwiTemporalInterp: boolean): void {
    this.fwiOptions.fwiSpacInterp = fwiSpacInterp;
    this.fwiOptions.fwiFromSpacWeather = fwiFromSpacWeather;
    this.fwiOptions.historyOnEffectedFWI = historyOnEffectedFWI;
    this.fwiOptions.burningConditionsOn = burningConditionsOn;
    this.fwiOptions.fwiTemporalInterp = fwiTemporalInterp;
  }
  
  /**
   * Clear the FWI options.
   */
  public clearFwiOptions(): void {
    this.fwiOptions.fwiSpacInterp = null;
    this.fwiOptions.fwiFromSpacWeather = null;
    this.fwiOptions.historyOnEffectedFWI = null;
    this.fwiOptions.burningConditionsOn = null;
    this.fwiOptions.fwiTemporalInterp = null;
  }
  
  /**
   * Add an ignition to the scenario.
   * @param ignition The ignition to add to the scenario.
   */
  public addIgnitionReference(ignition: Ignition): IgnitionReference {
    var ref = new IgnitionReference();
    ref.ignition = ignition.getId();
    this.ignitionInfo.push(ref);
    return ref;
  }
  
  /**
   * Remove a Ignition object from the ignition info.
   * @param ignition The Ignition object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeIgnitionReference(ignition: Ignition): boolean {
    let item = this.ignitionInfo.find(i => i.ignition == ignition.getId());
    if (item != null) {
      this.ignitionInfo.splice(this.ignitionInfo.indexOf(item), 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add a weather stream to the scenario.
   * @param stream The weather stream to add to the scenario.
   */
  public addWeatherStreamReference(stream: WeatherStream): StationStream {
    var add = new StationStream();
    add.stream = stream.getId();
    add.station = stream.getParentId();
    this.stationStreams.push(add);
    return add;
  }
  
  /**
   * Remove a WeatherStream object from the stream and station info.
   * @param stream The WeatherStream object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeWeatherStreamReference(stream: WeatherStream): boolean {
    var index1 = this.stationStreams.findIndex(element => element.stream == stream.getId());
    if (index1 != -1) {
      this.stationStreams.splice(index1, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add the primary weather stream to the scenario.
   * @param stream The weather stream to set as the scenario's primary stream.
   */
  public addPrimaryWeatherStreamReference(stream: WeatherStream): StationStream {
    var add = new StationStream();
    add.stream = stream.getId();
    add.station = stream.getParentId();
    add.primaryStream = true;
    this.stationStreams.push(add);
    return add;
  }
  
  /**
   * Remove the primary WeatherStream object from the stream and station info.
   * @param stream The WeatherStream object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removePrimaryWeatherStreamReference(stream: WeatherStream): boolean {
    var index1 = this.stationStreams.findIndex(element => element.primaryStream);
    if (index1 != -1) {
      this.stationStreams.splice(index1, 1)
      return true;
    }
    return false;
  }
  
  /**
   * Add a fuel breack to the scenario.
   * @param brck The fuel break to add to the scenario.
   */
  public addFuelBreakReference(brck: FuelBreak): FuelBreak {
    this.vectorInfo.push(brck.getId());
    return brck;
  }
  
  /**
   * Remove a FuelBreak object from the vector info.
   * @param brck The FuelBreak object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeFuelBreakReference(brck: FuelBreak): boolean {
    var index = this.vectorInfo.indexOf(brck.getId());
    if (index != -1) {
      this.vectorInfo.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add a weather grid to the scenario.
   * @param wthr The weather grid to add to the scenario.
   * @param index The layers index in the scenario.
   * @return LayerInfo The reference that was just added.
   */
  public addWeatherGridReference(wthr: WeatherGrid, index: number): LayerInfo {
    let tmp = new LayerInfo(wthr.getId());
    tmp.index = Math.round(index);
    this.layerInfo.push(tmp);
    return tmp;
  }
  
  /**
   * Add a grid file to the scenario.
   * @param grid The grid file to add to the scenario.
   * @param index The layers index in the scenario.
   * @return LayerInfo The reference that was just added.
   */
  public addGridFileReference(grid: GridFile, index: number): LayerInfo {
    let tmp = new LayerInfo(grid.getId());
    tmp.index = Math.round(index);
    this.layerInfo.push(tmp);
    return tmp;
  }
  
  /**
   * Add a fuel patch to the scenario.
   * @param patch The fuel patch to add to the scenario.
   * @param index The layers index in the scenario.
   * @return LayerInfo The reference that was just added.
   */
  public addFuelPatchReference(patch: FuelPatch, index: number): LayerInfo {
    let tmp = new LayerInfo(patch.getId());
    tmp.index = Math.round(index);
    this.layerInfo.push(tmp);
    return tmp;
  }
  
  /**
   * Add a weather patch to the scenario.
   * @param patch The weather patch to add to the scenario.
   * @param index The layers index in the scenario.
   * @return LayerInfo The reference that was just added.
   */
  public addWeatherPatchReference(patch: WeatherPatch, index: number): LayerInfo {
    let tmp = new LayerInfo(patch.getId());
    tmp.index = Math.round(index);
    this.layerInfo.push(tmp);
    return tmp;
  }
  
  /**
   * Remove a layer from the layer info.
   * @param ref The layer to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeLayerInfo(ref: LayerInfo): boolean {
    var index = this.layerInfo.indexOf(ref);
    if (index != -1) {
      this.layerInfo.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add an asset file to the scenario. Must already be added to the {@link WISE} object.
   * @param file The asset file to add to the scenario.
   */
  public addAssetFile(file: AssetFile): AssetReference {
    var ref = new AssetReference(file.getId());
    this.assetFiles.push(ref);
    return ref;
  }
  
  /**
   * Remove an asset file from the scenario.
   * @param file The asset file to remove from the scenario.
   */
  public removeAssetFile(ref: AssetReference): boolean {
    var index = this.assetFiles.indexOf(ref);
    if (index != -1) {
      this.assetFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add a target file to the scenario for wind direction. Must already be added to the {@link WISE} object.
   * @param file The target file to add to the scenario.
   */
  public setWindTargetFile(file: TargetFile): TargetReference {
    this.windTargetFile = new TargetReference(file.getId());
    return this.windTargetFile;
  }
  
  /**
   * Remove the wind target file from the scenario.
   */
  public clearWindTargetFile(): boolean {
    if (this.windTargetFile == null) {
      return false;
    }
    this.windTargetFile = null;
    return true;
  }
  
  /**
   * Add a target file to the scenario for vector direction. Must already be added to the {@link WISE} object.
   * @param file The target file to add to the scenario.
   */
  public setVectorTargetFile(file: TargetFile): TargetReference {
    this.vectorTargetFile = new TargetReference(file.getId());
    return this.vectorTargetFile;
  }
  
  /**
   * Remove the vector target file from the scenario.
   */
  public clearVectorTargetFile(): boolean {
    if (this.vectorTargetFile == null) {
      return false;
    }
    this.vectorTargetFile = null;
    return true;
  }
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the scenario.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (!this._id || this._id.length === 0) {
      errs.push(new ValidationError("id", "No ID has been set for the scenario.", this));
    }
    if (this.isCopy) {
      if (this.scenToCopy.length == 0) {
        errs.push(new ValidationError("scenToCopy", "The scenario has been specified as a copy of another but the other scenarios ID was not set.", this));
      }
    }
    else {
      if (this._startTime == null) {
        errs.push(new ValidationError("startTime", "The start time for the scenario has not been set.", this));
      }
      if (this._endTime == null) {
        errs.push(new ValidationError("endTime", "The end time for the scenario has not been set.", this));
      }
      if (this.displayInterval == null || this.displayInterval.toSeconds() == 0) {
        errs.push(new ValidationError("displayInterval", "The scenario display interval is not set.", this));
      }
      let tempErr = this.fgmOptions.checkValid();
      if (tempErr.length > 0) {
        let temp = new ValidationError("fgmOptions", "Invalid FGM options.", this);
        tempErr.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
      tempErr = this.fbpOptions.checkValid();
      if (tempErr.length > 0) {
        let temp = new ValidationError("fbpOptions", "Invalid FBP options.", this);
        tempErr.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
      tempErr = this.fmcOptions.checkValid();
      if (tempErr.length > 0) {
        let temp = new ValidationError("fmcOptions", "Invalid FMC options.", this);
        tempErr.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
      tempErr = this.fwiOptions.checkValid();
      if (tempErr.length > 0) {
        let temp = new ValidationError("fwiOptions", "Invalid FWI options.", this);
        tempErr.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
      let burns = new ValidationError("burningConditions", "Errors in burning condition.", this);
      for (let i = 0; i < this.burningConditions.length; i++) {
        const burnErr = new ValidationError(i, `Errors found in burn condition at ${i}.`, this.burningConditions);
        this.burningConditions[i].checkValid().forEach(err => {
          burnErr.addChild(err);
        });
        if (burnErr.children.length > 0) {
          burns.addChild(burnErr);
        }
      }
      if (burns.children.length > 0) {
        errs.push(burns);
      }
      let stationErrs = new Array<ValidationError>();
      for (let i = 0; i < this.stationStreams.length; i++) {
        const station = new ValidationError(i, `Errors found in weather stream reference at ${i}.`, this.stationStreams);
        this.stationStreams[i].checkValid().forEach(err => {
          station.addChild(err);
        });
        if (station.children.length > 0) {
          stationErrs.push(station);
        }
      }
      if (stationErrs.length > 0) {
        let temp = new ValidationError("stationStreams", "Errors found in weather stream references.", this);
        stationErrs.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
      let vectorErrs = new Array<ValidationError>();
      for (let i = 0; i < this.vectorInfo.length; i++) {
        if (this.vectorInfo[i].length == 0) {
          const vector = new ValidationError(i, `Errors found in vector reference at ${i}.`, this.vectorInfo);
          vector.addChild(new ValidationError(i, "No vector ID has been specified.", this));
          vectorErrs.push(vector);
        }
      }
      if (vectorErrs.length > 0) {
        let temp = new ValidationError("vectorInfo", "Errors found in vector references.", this);
        vectorErrs.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
      let ignitionErrs = new Array<ValidationError>();
      for (let i = 0; i < this.ignitionInfo.length; i++) {
        const ignition = new ValidationError(i, `Errors found in ignition reference at ${i}.`, this.ignitionInfo);
        this.ignitionInfo[i].checkValid().forEach(err => {
          ignition.addChild(err);
        });
        if (ignition.children.length > 0) {
          ignitionErrs.push(ignition);
        }
      }
      if (ignitionErrs.length > 0) {
        let temp = new ValidationError("ignitionInfo", "Errors found in ignition references.", this);
        ignitionErrs.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
      let layerErrs = new Array<ValidationError>();
      for (let i = 0; i < this.layerInfo.length; i++) {
        const layer = new ValidationError(i, `Errors found in layer reference at ${i}.`, this.layerInfo);
        this.layerInfo[i].checkValid().forEach(err => {
          layer.addChild(err);
        });
        if (layer.children.length > 0) {
          layerErrs.push(layer);
        }
      }
      if (layerErrs.length > 0) {
        let temp = new ValidationError("layerInfo", "Errors found in layer references.", this);
        layerErrs.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
      let assetErrs = new Array<ValidationError>();
      for (let i = 0; i < this.assetFiles.length; i++) {
        const asset = new ValidationError(i, `Errors found in asset reference at ${i}.`, this.assetFiles);
        this.assetFiles[i].checkValid().forEach(err => {
          asset.addChild(err);
        });
        if (asset.children.length > 0) {
          assetErrs.push(asset);
        }
      }
      if (assetErrs.length > 0) {
        let temp = new ValidationError("assetFiles", "Errors found in asset references.", this);
        assetErrs.forEach(err => {
          temp.addChild(err);
        });
        errs.push(temp);
      }
      if (this.windTargetFile != null) {
        let temp = new ValidationError("windTargetFile", "Errors found in target reference.", this);
        this.windTargetFile.checkValid().forEach(err => {
          temp.addChild(err);
        });
        if (temp.children.length > 0) {
          errs.push(temp);
        }
      }
      if (this.vectorTargetFile != null) {
        let temp = new ValidationError("vectorTargetFile", "Errors found in target references.", this);
        this.vectorTargetFile.checkValid().forEach(err => {
          temp.addChild(err);
        });
        if (temp.children.length > 0) {
          errs.push(temp);
        }
      }
    }
    return errs;
  }
  
  /**
   * Streams the scenario to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    builder.write(Scenario.PARAM_SCENARIO_BEGIN + SocketMsg.NEWLINE);
    builder.write(Scenario.PARAM_SCENARIONAME + SocketMsg.NEWLINE);
    builder.write(this._id + SocketMsg.NEWLINE);
    
    builder.write(Scenario.PARAM_DISPLAY_INTERVAL + SocketMsg.NEWLINE);
    builder.write(this.displayInterval + SocketMsg.NEWLINE);
    
    if (this.isCopy) {
      builder.write(Scenario.PARAM_SCENARIO_TO_COPY + SocketMsg.NEWLINE);
      builder.write(this.scenToCopy + SocketMsg.NEWLINE);
    }
    
    if (!this.isCopy || this._startTime != null) {
      builder.write(Scenario.PARAM_STARTTIME + SocketMsg.NEWLINE);
      builder.write(this._startTime.toISO() + SocketMsg.NEWLINE);
    }
    
    if (!this.isCopy || this._endTime != null) {
      builder.write(Scenario.PARAM_ENDTIME + SocketMsg.NEWLINE);
      builder.write(this._endTime.toISO() + SocketMsg.NEWLINE);
    }
    
    if (this.comments.length > 0) {
      builder.write(Scenario.PARAM_COMMENTS + SocketMsg.NEWLINE);
      builder.write(this.comments + SocketMsg.NEWLINE);
    }
    
    if (this.isCopy) {
      this.fgmOptions.streamCopy(builder);
      this.fbpOptions.streamCopy(builder);
      this.fmcOptions.streamCopy(builder);
    }
    else {
      this.fgmOptions.stream(builder);
      this.fbpOptions.stream(builder);
      this.fmcOptions.stream(builder);
    }
    
    this.fwiOptions.stream(builder);
    
    for (let bc of this.burningConditions) {
      let tmp = bc.date + '|' + bc.startTime + '|' + bc.endTime + '|' + bc.fwiGreater + '|' + bc.wsGreater + '|' + bc.rhLess + '|' + bc.isiGreater + '|' + bc.startTimeOffset + '|' + bc.endTimeOffset;
      builder.write(Scenario.PARAM_BURNINGCONDITION + SocketMsg.NEWLINE);
      builder.write(tmp + SocketMsg.NEWLINE);
    }
    
    for (let vi of this.vectorInfo) {
      builder.write(Scenario.PARAM_VECTOR_REF + SocketMsg.NEWLINE);
      builder.write(vi + SocketMsg.NEWLINE);
    }
    
    for (let i = 0; i < this.stationStreams.length; i++) {
      let tmp = this.stationStreams[i].stream + '|' + this.stationStreams[i].station;
      if (this.stationStreams[i].streamOptions) {
        tmp = tmp + '|' + this.stationStreams[i].streamOptions!.name + '|' + this.stationStreams[i].streamOptions!.startTime;
        tmp = tmp + '|' + this.stationStreams[i].streamOptions!.endTime + '|' + this.stationStreams[i].streamOptions!.ignitionTime;
      }
      builder.write(Scenario.PARAM_STREAM_REF + SocketMsg.NEWLINE);
      builder.write(tmp + SocketMsg.NEWLINE);
    }
    
    for (let i = 0; i < this.layerInfo.length; i++) {
      let tmp = this.layerInfo[i].getName() + '|' + this.layerInfo[i].index;
      if (this.layerInfo[i].options) {
        tmp = tmp + '|' + this.layerInfo[i].options!.subNames.length;
        for (let o of this.layerInfo[i].options!.subNames) {
          tmp = tmp + '|' + o;
        }
      }
      builder.write(Scenario.PARAM_LAYER_INFO + SocketMsg.NEWLINE);
      builder.write(tmp + SocketMsg.NEWLINE);
    }
    
    var index1 = this.stationStreams.findIndex(element => element.primaryStream);
    if (index1 != -1) {
      builder.write(Scenario.PARAM_PRIMARY_STREAM + SocketMsg.NEWLINE);
      builder.write(this.stationStreams[index1].stream + SocketMsg.NEWLINE);
    }
    
    for (let ii of this.ignitionInfo) {
      let tmp = ii.ignition;
      if (ii.polylineIgnitionOptions != null) {
        tmp = tmp + '|line|' + ii.polylineIgnitionOptions.name + '|' + ii.polylineIgnitionOptions.pointSpacing;
        tmp = tmp + '|' + ii.polylineIgnitionOptions.polyIndex + '|' + ii.polylineIgnitionOptions.pointIndex;
      }
      else if (ii.multiPointIgnitionOptions != null) {
        tmp = tmp + '|mp|' + ii.multiPointIgnitionOptions.name + '|' + ii.multiPointIgnitionOptions.pointIndex;
      }
      else if (ii.singlePointIgnitionOptions != null) {
        tmp = tmp + '|sp|' + ii.singlePointIgnitionOptions.name;
      }
      builder.write(Scenario.PARAM_IGNITION_REF + SocketMsg.NEWLINE);
      builder.write(tmp + SocketMsg.NEWLINE);
    }
    
    for (let ii of this.assetFiles) {
      let tmp = ii.getName() + '|' + ii.operation + '|' + ii.collisionCount;
      builder.write(Scenario.PARAM_ASSET_REF + SocketMsg.NEWLINE);
      builder.write(tmp + SocketMsg.NEWLINE);
    }
    
    if (this.windTargetFile != null) {
      let tmp = this.windTargetFile.getName() + '|' + this.windTargetFile.geometryIndex + '|' + this.windTargetFile.pointIndex;
      builder.write(Scenario.PARAM_WIND_TARGET_REF + SocketMsg.NEWLINE);
      builder.write(tmp + SocketMsg.NEWLINE);
    }
    
    if (this.vectorTargetFile != null) {
      let tmp = this.vectorTargetFile.getName() + '|' + this.vectorTargetFile.geometryIndex + '|' + this.vectorTargetFile.pointIndex;
      builder.write(Scenario.PARAM_VECTOR_TARGET_REF + SocketMsg.NEWLINE);
      builder.write(tmp + SocketMsg.NEWLINE);
    }
    
    if (this.stopModellingOptions != null) {
      this.stopModellingOptions.stream(builder);
    }
    
    builder.write(Scenario.PARAM_SCENARIO_END + SocketMsg.NEWLINE);
  }
}

/**
 * Types of options that can be applied to the fuels in
 * the lookup table.
 */
export enum FuelOptionType {
  GRASS_FUEL_LOAD = 0,
  GRASS_CURING = 1,
  PERCENT_CONIFER = 2,
  PERCENT_DEAD_FIR = 3,
  CROWN_BASE_HEIGHT = 4,
  CROWN_FUEL_LOAD = 5
}

/**
 * Stores options for various fuel types including default grass fuel load,
 * grass curing, percent conifer, and percent dead fir.
 * @author Travis Redpath
 */
export class FuelOption {
  private static readonly PARAM_FUEL_OPTION = "fuel_option_setting";
  
  /**
   * The type of fuel to apply the option to.
   */
  public fuelType: string;
  /**
   * The option that is to be applied.
   */
  public optionType: FuelOptionType;
  /**
   * The value of the applied option.
   */
  public value: number;
  
  /**
   * Find all errors that may exist in the fuel option.
   * @returns A list of all errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    
    if (this.fuelType == null || this.fuelType.length == 0) {
      errs.push(new ValidationError("fuelType", "No fuel type has been specified.", this));
    }
    if (this.optionType == FuelOptionType.CROWN_BASE_HEIGHT) {
      if (this.value < 0.0 || this.value > 25.0) {
        errs.push(new ValidationError("value", "An invalid crown base height has been specified.", this));
      }
    }
    else if (this.optionType == FuelOptionType.GRASS_CURING) {
      if (this.value < 0.0 || this.value > 1.0) {
        errs.push(new ValidationError("value", "An invalid grass curing degree has been specified.", this));
      }
    }
    else if (this.optionType == FuelOptionType.GRASS_FUEL_LOAD) {
      if (this.value < 0.0 || this.value > 5.0) {
        errs.push(new ValidationError("value", "An invalid grass fuel load has been specified.", this));
      }
    }
    else if (this.optionType == FuelOptionType.PERCENT_CONIFER) {
      if (this.value < 0.0 || this.value > 100.0) {
        errs.push(new ValidationError("value", "An invalid percent conifer has been specified.", this));
      }
    }
    else if (this.optionType == FuelOptionType.PERCENT_DEAD_FIR) {
      if (this.value < 0.0 || this.value > 100.0) {
        errs.push(new ValidationError("value", "An invalid percent dead fir has been specified.", this));
      }
    }
    else if (this.optionType == FuelOptionType.CROWN_FUEL_LOAD) {
      if (this.value < 0.0) {
        errs.push(new ValidationError("value", "An invalid crown fuel load has been specified.", this));
      }
    }
    
    return errs;
  }
  
  /**
   * Streams the fuel option to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    let data = `${this.fuelType}|${this.optionType}|${this.value}${SocketMsg.NEWLINE}`;
    
    builder.write(FuelOption.PARAM_FUEL_OPTION + SocketMsg.NEWLINE);
    builder.write(data);
  }
}

/**
 * A class that holds information about the files and settings that will be inputs to W.I.S.E..
 * @author "Travis Redpath"
 */
export class WISEInputs {
  /**
   * Information about the files that may be needed by the scenarios.
   */
  public files: WISEInputsFiles;
  /**
   * All weather stations. At least one is required.
   */
  public weatherStations = new Array<WeatherStation>();
  /**
   * All ignition features.
   */
  public ignitions = new Array<Ignition>();
  /**
   * The scenarios to run. At least one is required.
   */
  public scenarios = new Array<Scenario>();
  /**
   * The timezone of the scenarios (required).
   */
  public timezone: Timezone;
  /**
   * Options to apply to the fuel types in the LUT file.
   */
  public fuelOptions = new Array<FuelOption>();
  /**
   * Assets that can stop simulations when reached.
   */
  public assetFiles = new Array<AssetFile>();
  /**
   * Targets that can affect how weather information is processed.
   */
  public targetFiles = new Array<TargetFile>();
  
  public constructor() {
    this.files = new WISEInputsFiles();
    this.timezone = new Timezone();
  }
  
  /**
   * Validate the user specified inputs.
   * @returns A list of errors found during validation.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find any errors in the W.I.S.E. input values.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    let _errors = new Array<ValidationError>();
    let errs = this.timezone.checkValid();
    if (errs.length > 0) {
      let timeErr = new ValidationError("timezone", "Errors in the simulation timezone.", this);
      errs.forEach(err => {
        timeErr.addChild(err);
      });
      _errors.push(timeErr);
    }
    errs = this.files.checkValid();
    if (errs.length > 0) {
      let timeErr = new ValidationError("files", "Errors in W,I.S.E. input files.", this);
      errs.forEach(err => {
        timeErr.addChild(err);
      });
      _errors.push(timeErr);
    }
    if (this.weatherStations.length < 1) {
      _errors.push(new ValidationError("weatherStations", "No weather stations have been added.", this));
    }
    if (this.scenarios.length < 1) {
      _errors.push(new ValidationError("scenarios", "No scenarios have been added.", this));
    }
    let weatherStationErrors = new Array<ValidationError>();
    for (let i = 0; i < this.weatherStations.length; i++) {
      let wsErr = new ValidationError(i, `Errors found in weather station at index ${i}.`, this.weatherStations);
      for (let j = i + 1; j < this.weatherStations.length; j++) {
        if (this.weatherStations[i].id.toUpperCase() === this.weatherStations[j].id.toUpperCase()) {
          let err = new ValidationError("id", "Duplicate weather station IDs.", this.weatherStations[i]);
          wsErr.addChild(err);
          break;
        }
      }
      this.weatherStations[i].checkValid().forEach(err => {
        wsErr.addChild(err);
      });
      if (wsErr.children.length > 0) {
        weatherStationErrors.push(wsErr);
      }
    }
    if (weatherStationErrors.length > 0) {
      let temp = new ValidationError("weatherStations", "Errors found in weather stations.", this);
      weatherStationErrors.forEach(err => {
        temp.addChild(err);
      })
      errs.push(temp);
    }
    let ignitionErrors = new Array<ValidationError>();
    for (let i = 0; i < this.ignitions.length; i++) {
      let igErr = new ValidationError(i, `Errors found in ignition at index ${i}.`, this.ignitions);
      for (let j = i + 1; j < this.ignitions.length; j++) {
        if (this.ignitions[i].id.toUpperCase() === this.ignitions[j].id.toUpperCase()) {
          let err = new ValidationError("id", "Duplicate ignition IDs.", this.ignitions[i]);
          igErr.addChild(err);
          break;
        }
      }
      this.ignitions[i].checkValid().forEach(err => {
        igErr.addChild(err);
      });
      if (igErr.children.length > 0) {
        ignitionErrors.push(igErr);
      }
    }
    if (ignitionErrors.length > 0) {
      let temp = new ValidationError("ignitions", "Errors found in ignitions.", this);
      ignitionErrors.forEach(err => {
        temp.addChild(err);
      })
      errs.push(temp);
    }
    let scenarioErrors = new Array<ValidationError>();
    for (let i = 0; i < this.scenarios.length; i++) {
      let scErr = new ValidationError(i, `Errors found in scenario at index ${i}.`, this.scenarios);
      for (let j = i + 1; j < this.scenarios.length; j++) {
        if (this.scenarios[i].id.toUpperCase() === this.scenarios[j].id.toUpperCase()) {
          let err = new ValidationError("id", "Duplicate scenario IDs.", this.scenarios[i]);
          scErr.addChild(err);
          break;
        }
      }
      this.scenarios[i].checkValid().forEach(err => {
        scErr.addChild(err);
      });
      if (scErr.children.length > 0) {
        scenarioErrors.push(scErr);
      }
    }
    if (scenarioErrors.length > 0) {
      let temp = new ValidationError("scenarios", "Errors found in scenarios.", this);
      scenarioErrors.forEach(err => {
        temp.addChild(err);
      })
      errs.push(temp);
    }
    let assetErrors = new Array<ValidationError>();
    for (let i = 0; i < this.assetFiles.length; i++) {
      let asErr = new ValidationError(i, `Errors found in scenario at index ${i}.`, this.assetFiles);
      for (let j = i + 1; j < this.assetFiles.length; j++) {
        if (this.assetFiles[i].getId().toUpperCase() === this.assetFiles[j].getId().toUpperCase()) {
          let err = new ValidationError("id", "Duplicate asset IDs.", this.assetFiles[i]);
          asErr.addChild(err);
          break;
        }
      }
      this.assetFiles[i].checkValid().forEach(err => {
        asErr.addChild(err);
      });
      if (asErr.children.length > 0) {
        scenarioErrors.push(asErr);
      }
    }
    if (assetErrors.length > 0) {
      let temp = new ValidationError("assetFiles", "Errors found in assets.", this);
      assetErrors.forEach(err => {
        temp.addChild(err);
      })
      errs.push(temp);
    }
    let targetErrors = new Array<ValidationError>();
    for (let i = 0; i < this.targetFiles.length; i++) {
      let tgErr = new ValidationError(i, `Errors found in scenario at index ${i}.`, this.targetFiles);
      for (let j = i + 1; j < this.targetFiles.length; j++) {
        if (this.targetFiles[i].getId().toUpperCase() === this.targetFiles[j].getId().toUpperCase()) {
          let err = new ValidationError("id", "Duplicate target IDs.", this.targetFiles[i]);
          tgErr.addChild(err);
          break;
        }
      }
      this.targetFiles[i].checkValid().forEach(err => {
        tgErr.addChild(err);
      });
      if (tgErr.children.length > 0) {
        scenarioErrors.push(tgErr);
      }
    }
    if (targetErrors.length > 0) {
      let temp = new ValidationError("targetFiles", "Errors found in targets.", this);
      targetErrors.forEach(err => {
        temp.addChild(err);
      })
      errs.push(temp);
    }
    let fuelOptionErrors = new Array<ValidationError>();
    for (let i = 0; i < this.fuelOptions.length; i++) {
      let foErrs = this.fuelOptions[i].checkValid();
      if (foErrs.length > 0) {
        let temp = new ValidationError(i, `Errors found in fuel options at index ${i}.`, this.fuelOptions);
        foErrs.forEach(err => {
          temp.addChild(err);
        });
        fuelOptionErrors.push(temp);
      }
    }
    if (fuelOptionErrors.length > 0) {
      let temp = new ValidationError("fuelOptions", "Errors found in fuel options.", this);
      fuelOptionErrors.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    return errs;
  }
  
  /**
   * Streams the input settings to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    this.files.stream(builder);
    
    for (let ws of this.weatherStations) {
      ws.stream(builder);
    }
    for (let ig of this.ignitions) {
      ig.stream(builder);
    }
    for (let sc of this.scenarios) {
      sc.stream(builder);
    }
    for (let opt of this.fuelOptions) {
      opt.stream(builder);
    }
    for (let asset of this.assetFiles) {
      asset.stream(builder);
    }
    for (let target of this.targetFiles) {
      target.stream(builder);
    }
    return this.timezone.stream(builder);
  }
}

export enum Output_GridFileInterpolation {
  /**
   * Interpolate using the nearest vertex to the centre of the grid cell.
   */
  CLOSEST_VERTEX = "ClosestVertex",
  /**
   * Interpolate using inverse distance weighting.
   */
  IDW = "IDW",
  /**
   * Interpolate using voronoi area weighting.
   */
  AREA_WEIGHTING = "AreaWeighting",
  CALCULATE = "Calculate",
  DISCRETIZED = "Discretized",
  VORONOI_OVERLAP = "VoronoiOverlap"
}

/**
 * If the grid file is a TIF file its contents can be
 * compressed. This describes the algorithm used to
 * compress the data.
 */
export enum Output_GridFileCompression {
  NONE = 0,
  /**
   * Should only be used with byte data.
   */
  JPEG = 1,
  LZW = 2,
  PACKBITS = 3,
  DEFLATE = 4,
  /**
   * Should only be used with bit data.
   */
  CCITTRLE = 5,
  /**
   * Should only be used with bit data.
   */
  CCITTFAX3 = 6,
  /**
   * Should only be used with bit data.
   */
  CCITTFAX4 = 7,
  LZMA = 8,
  ZSTD = 9,
  LERC = 10,
  LERC_DEFLATE = 11,
  LERC_ZSTD = 12,
  WEBP = 13
}

/**
 * Override the output time for a specific sub-scenario.
 */
export class ExportTimeOverride {
  /**
   * The name of the sub-scenario that the override time is for.
   */
  public subScenarioName: string|null = null;
  
  /**
   * The export time to use instead of the one defined in the {@link Output_GridFile} class.
   */
  private _exportTime: DateTime|null = null;
  /**
   * Get the override for the export time as a Luxon DateTime.
   */
  get lExportTime(): DateTime|null {
    return this._exportTime;
  }
  /**
   * Get the override for the export time as an ISO8601 string.
   * @deprecated
   */
  get exportTime(): string {
    return this.getExportOverrideTime();
  }
  /**
   * Set the override for the export time using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lExportTime(value: DateTime|null) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The override for the export time is not valid");
    }
    this._exportTime = value;
  }
  /**
   * Set the override for the export time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set exportTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The override for the export time is not valid");
    }
    this._exportTime = DateTime.fromISO(value);
  }
  public getExportOverrideTime() : string {
    return this._exportTime == null ? "" : this._exportTime.toISO();
  }
  
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    
    if (this.subScenarioName == null || this.subScenarioName.length == 0) {
      errs.push(new ValidationError("subScenarioName", "The sub-scenario that the override is for has not been set.", this));
    }
    
    return errs;
  }
}

/**
 * Export a fuel grid.
 */
export class Output_FuelGridFile {
  private static readonly PARAM_GRIDFILE = "fuel_grid_export";
  
  /**
   * The name of the output file (required).
   * The file will be located below the jobs output directory.
   * All global paths and relative paths that attempt to move
   * the file outside of this directory will be removed.
   */
  public filename: string = "";
  
  /**
   * The name of the scenario that this output is for (required).
   */
  public scenarioName: string = "";
  
  /**
   * Should the file be streamed/uploaded to an external service after
   * it has been created? The streaming services are defined by
   * {@link OutputStreamInfo} and helper methods such as
   * {@link WISE#streamOutputToMqtt} or {@link WISE#streamOutputToGeoServer}.
   */
  public shouldStream: boolean = false;
  
  /**
   * If the output file is a TIF file the contents will be compressed
   * using this method.
   */
  public compression = Output_GridFileCompression.NONE;
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this.filename.length == 0) {
      errs.push(new ValidationError("filename", "No output filename has been specified.", this));
    }
    if (this.scenarioName.length == 0) {
      errs.push(new ValidationError("scenarioName", "The scenario that the output is for has not been specified.", this));
    }
    return errs;
  }
  
  /**
   * Streams the grid file to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    let tmp = this.scenarioName + '|' + this.filename + '|' + this.compression + '|' + (+this.shouldStream);
    builder.write(Output_FuelGridFile.PARAM_GRIDFILE + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

export class Output_GridFile {
  private static readonly PARAM_GRIDFILE = "gridfile";
  
  /**
   * The name of the output file (required).
   * The file will be located below the jobs output directory.
   * All global paths and relative paths that attempt to move
   * the file outside of this directory will be removed.
   */
  public filename: string = "";
  /**
   * The end of the output time range (required). Will also be
   * used as the start of the output time range if the start
   * output time has not been specified.
   */
  private _outputTime: DateTime;
  /**
   * Get the end export time as a Luxon DateTime.
   */
  get lOutputTime(): DateTime {
    return this._outputTime;
  }
  /**
   * Get the end export time as an ISO8601 string.
   * @deprecated Use lOutputTime instead.
   */
  get outputTime(): string {
    return this._outputTime == null ? "" : this._outputTime.toISO();
  }
  /**
   * Set the end export time using a Luxon DateTime. Cannot be null. If
   * the start export time is not set this value will also be used for
   * the start time.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lOutputTime(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The export time is not valid");
    }
    this._outputTime = value;
  }
  /**
   * Set the export time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * If the start export time is not set this value will also be used for
   * the start time.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated Use lOutputTime instead.
   */
  set outputTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The export time is not valid");
    }
    this._outputTime = DateTime.fromISO(value);
  }
  /**
   * The start of the output time range (optional).
   */
  private _startOutputTime: DateTime|null = null;
  /**
   * Get the start export time as a Luxon DateTime.
   */
  get lStartOutputTime(): DateTime|null {
    return this._startOutputTime;
  }
  /**
   * Get the start export time as an ISO8601 string.
   * @deprecated Use lStartOutputTime instead.
   */
  get startOutputTime(): string {
    return this._startOutputTime == null ? "" : this._startOutputTime.toISO();
  }
  /**
   * Set the start export time using a Luxon DateTime. Use null to clear the value.
   */
  set lStartOutputTime(value: DateTime|null) {
    this._startOutputTime = value;
  }
  /**
   * Set the start export time using a string. Use null to clear the value.
   * @deprecated Use lOutputTime instead.
   */
  set startOutputTime(value: string) {
    this._startOutputTime = DateTime.fromISO(value);
  }
  private _statistic: GlobalStatistics;
  /**
   * The statistic that should be output (required). If the statistic is TOTAL_FUEL_CONSUMED, SURFACE_FUEL_CONSUMED,
   * CROWN_FUEL_CONSUMED, or RADIATIVE_POWER the {@link Output_GridFileInterpolation interpolation method} must be DISCRETIZED.
   * Setting the output statistic to any of those values will automatically set the interpolation method.
   * 
   * Valid values:
   * <ul>
   * <li>TEMPERATURE</li>
   * <li>DEW_POINT</li>
   * <li>RELATIVE_HUMIDITY</li>
   * <li>WIND_DIRECTION</li>
   * <li>WIND_SPEED</li>
   * <li>PRECIPITATION</li>
   * <li>FFMC</li>
   * <li>ISI</li>
   * <li>FWI</li>
   * <li>BUI</li>
   * <li>MAX_FI</li>
   * <li>MAX_FL</li>
   * <li>MAX_ROS</li>
   * <li>MAX_SFC</li>
   * <li>MAX_CFC</li>
   * <li>MAX_TFC</li>
   * <li>MAX_CFB</li>
   * <li>RAZ</li>
   * <li>BURN_GRID</li>
   * <li>FIRE_ARRIVAL_TIME</li>
   * <li>HROS</li>
   * <li>FROS</li>
   * <li>BROS</li>
   * <li>RSS</li>
   * <li>ACTIVE_PERIMETER</li>
   * <li>BURN</li>
   * <li>BURN_PERCENTAGE</li>
   * <li>FIRE_ARRIVAL_TIME_MIN</li>
   * <li>FIRE_ARRIVAL_TIME_MAX</li>
   * <li>TOTAL_FUEL_CONSUMED</li>
   * <li>SURFACE_FUEL_CONSUMED</li>
   * <li>CROWN_FUEL_CONSUMED</li>
   * <li>RADIATIVE_POWER</li>
   * <li>HFI</li>
   * <li>HCFB</li>
   * <li>HROS_MAP</li>
   * <li>FROS_MAP</li>
   * <li>BROS_MAP</li>
   * <li>RSS_MAP</li>
   * <li>RAZ_MAP</li>
   * <li>FMC_MAP</li>
   * <li>CFB_MAP</li>
   * <li>CFC_MAP</li>
   * <li>SFC_MAP</li>
   * <li>TFC_MAP</li>
   * <li>FI_MAP</li>
   * <li>FL_MAP</li>
   * <li>CURINGDEGREE_MAP</li>
   * <li>GREENUP_MAP</li>
   * <li>PC_MAP</li>
   * <li>PDF_MAP</li>
   * <li>CBH_MAP</li>
   * <li>TREE_HEIGHT_MAP</li>
   * <li>FUEL_LOAD_MAP</li>
   * <li>CFL_MAP</li>
   * <li>GRASSPHENOLOGY_MAP</li>
   * <li>ROSVECTOR_MAP</li>
   * <li>DIRVECTOR_MAP</li>
   * <li>CRITICAL_PATH</li>
   * <li>CRITICAL_PATH_PERCENTAGE</li>
   * </ul>
   */
  get statistic(): GlobalStatistics {
    return this._statistic;
  }
  /**
   * The statistic that should be output (required). If the statistic is TOTAL_FUEL_CONSUMED, SURFACE_FUEL_CONSUMED,
   * CROWN_FUEL_CONSUMED, or RADIATIVE_POWER the {@link Output_GridFileInterpolation interpolation method} must be DISCRETIZED.
   * Setting the output statistic to any of those values will automatically set the interpolation method.
   * 
   * Valid values:
   * <ul>
   * <li>TEMPERATURE</li>
   * <li>DEW_POINT</li>
   * <li>RELATIVE_HUMIDITY</li>
   * <li>WIND_DIRECTION</li>
   * <li>WIND_SPEED</li>
   * <li>PRECIPITATION</li>
   * <li>FFMC</li>
   * <li>ISI</li>
   * <li>FWI</li>
   * <li>BUI</li>
   * <li>MAX_FI</li>
   * <li>MAX_FL</li>
   * <li>MAX_ROS</li>
   * <li>MAX_SFC</li>
   * <li>MAX_CFC</li>
   * <li>MAX_TFC</li>
   * <li>MAX_CFB</li>
   * <li>RAZ</li>
   * <li>BURN_GRID</li>
   * <li>FIRE_ARRIVAL_TIME</li>
   * <li>HROS</li>
   * <li>FROS</li>
   * <li>BROS</li>
   * <li>RSS</li>
   * <li>ACTIVE_PERIMETER</li>
   * <li>BURN</li>
   * <li>BURN_PERCENTAGE</li>
   * <li>FIRE_ARRIVAL_TIME_MIN</li>
   * <li>FIRE_ARRIVAL_TIME_MAX</li>
   * <li>TOTAL_FUEL_CONSUMED</li>
   * <li>SURFACE_FUEL_CONSUMED</li>
   * <li>CROWN_FUEL_CONSUMED</li>
   * <li>RADIATIVE_POWER</li>
   * <li>HFI</li>
   * <li>HCFB</li>
   * <li>HROS_MAP</li>
   * <li>FROS_MAP</li>
   * <li>BROS_MAP</li>
   * <li>RSS_MAP</li>
   * <li>RAZ_MAP</li>
   * <li>FMC_MAP</li>
   * <li>CFB_MAP</li>
   * <li>CFC_MAP</li>
   * <li>SFC_MAP</li>
   * <li>TFC_MAP</li>
   * <li>FI_MAP</li>
   * <li>FL_MAP</li>
   * <li>CURINGDEGREE_MAP</li>
   * <li>GREENUP_MAP</li>
   * <li>PC_MAP</li>
   * <li>PDF_MAP</li>
   * <li>CBH_MAP</li>
   * <li>TREE_HEIGHT_MAP</li>
   * <li>FUEL_LOAD_MAP</li>
   * <li>CFL_MAP</li>
   * <li>GRASSPHENOLOGY_MAP</li>
   * <li>ROSVECTOR_MAP</li>
   * <li>DIRVECTOR_MAP</li>
   * <li>CRITICAL_PATH</li>
   * <li>CRITICAL_PATH_PERCENTAGE</li>
   * </ul>
   */
  set statistic(value: GlobalStatistics) {
    this._statistic = value;
    if (value === GlobalStatistics.TOTAL_FUEL_CONSUMED || value === GlobalStatistics.SURFACE_FUEL_CONSUMED ||
        value === GlobalStatistics.CROWN_FUEL_CONSUMED || value === GlobalStatistics.RADIATIVE_POWER) {
      this.interpMethod = Output_GridFileInterpolation.DISCRETIZED;
    }
  }
  /**
   * The interpolation method (required).
   */
  public interpMethod: Output_GridFileInterpolation;
  /**
   * The amount to discritize the existing grid to (optional).
   * Only applicable if the interpolation mode is set to {@link Output_GridFileInterpolation.DISCRETIZED}.
   * Must be in [1, 1000].
   */
  public discretize: number|null = null;
  /**
   * The name of the scenario that this output is for (required).
   */
  public scenarioName: string = "";
  /**
   * Should the file be streamed/uploaded to an external service after
   * it has been created? The streaming services are defined by
   * {@link OutputStreamInfo} and helper methods such as
   * {@link WISE#streamOutputToMqtt} or {@link WISE#streamOutputToGeoServer}.
   */
  public shouldStream: boolean = false;
  /**
   * If the output file is a TIF file the contents will be compressed
   * using this method.
   */
  public compression = Output_GridFileCompression.NONE;
  /**
   * Should the output file be minimized to just its bounding box (true) or should it cover the entire
   * grid area (false).
   */
  public shouldMinimize: boolean  = false;
  /**
   * The name of a specific sub-scenario that the output is for (if it should be for a subscenario).
   */
  public subScenarioName: string|null = null;
  /**
   * Should zero be placed in the exported grid file where no statistics exist? The default (if false)
   * is to output NODATA.
   */
  public zeroForNodata = false;
  /**
   * Should the interior of the starting ignition polygon be excluded from the grid export.
   */
  public excludeInteriors = false;
  /**
   * The name of an asset to use when creating the grid. Only valid for critical path grids.
   */
  public assetName: string|null = null;
  /**
   * The index of a shape within the asset shapefile to use for critical paths instead of the entire shapefile.
   */
  public assetIndex: number|null = null;
  
  /**
   * A list of export time overrides for different sub-scenarios that may be created
   * for the specified scenario.
   */
  private subScenarioOverrideTimes: Array<ExportTimeOverride>  = new Array<ExportTimeOverride>();
  
  public add_subScenarioOverrideTimes(add: ExportTimeOverride): void {
    this.subScenarioOverrideTimes.push(add);
  }
  public remove_subScenarioOverrideTimes(remove: ExportTimeOverride): void {
    var ind = this.subScenarioOverrideTimes.indexOf(remove);
    this.subScenarioOverrideTimes.splice(ind, 1);
  }
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this.filename.length == 0) {
      errs.push(new ValidationError("filename", "No output filename has been specified.", this));
    }
    if (this._outputTime == null) {
      errs.push(new ValidationError("lOutputTime", "The simulation time to export at has not been specified.", this));
    }
    if (this.scenarioName.length == 0) {
      errs.push(new ValidationError("scenarioName", "The scenario that the output is for has not been specified.", this));
    }
    if (this.interpMethod == null) {
      errs.push(new ValidationError("interpMethod", "The interpolation method has not been specified.", this));
    }
    if (this.discretize != null && (this.discretize < 1 || this.discretize > 1000)) {
      errs.push(new ValidationError("discritize", "The discritization must be an integer greater than 0 and less than 1001.", this));
    }
    if (this.statistic == null) {
      errs.push(new ValidationError("statistic", "The statistic to export has not been specified.", this));
    }
    else if (this.statistic != GlobalStatistics.TEMPERATURE && this.statistic != GlobalStatistics.DEW_POINT && this.statistic != GlobalStatistics.RELATIVE_HUMIDITY &&
              this.statistic != GlobalStatistics.WIND_DIRECTION && this.statistic != GlobalStatistics.WIND_SPEED && this.statistic != GlobalStatistics.PRECIPITATION &&
              this.statistic != GlobalStatistics.FFMC && this.statistic != GlobalStatistics.ISI && this.statistic != GlobalStatistics.FWI &&
              this.statistic != GlobalStatistics.BUI && this.statistic != GlobalStatistics.MAX_FI && this.statistic != GlobalStatistics.MAX_FL &&
              this.statistic != GlobalStatistics.MAX_ROS && this.statistic != GlobalStatistics.MAX_SFC && this.statistic != GlobalStatistics.MAX_CFC &&
              this.statistic != GlobalStatistics.MAX_TFC && this.statistic != GlobalStatistics.MAX_CFB && this.statistic != GlobalStatistics.RAZ &&
              this.statistic != GlobalStatistics.BURN_GRID && this.statistic != GlobalStatistics.FIRE_ARRIVAL_TIME && this.statistic != GlobalStatistics.HROS &&
              this.statistic != GlobalStatistics.FROS && this.statistic != GlobalStatistics.BROS && this.statistic != GlobalStatistics.RSS &&
              this.statistic != GlobalStatistics.ACTIVE_PERIMETER && this.statistic != GlobalStatistics.BURN && this.statistic != GlobalStatistics.BURN_PERCENTAGE &&
              this.statistic != GlobalStatistics.FIRE_ARRIVAL_TIME_MIN && this.statistic != GlobalStatistics.FIRE_ARRIVAL_TIME_MAX && this.statistic != GlobalStatistics.TOTAL_FUEL_CONSUMED &&
              this.statistic != GlobalStatistics.SURFACE_FUEL_CONSUMED && this.statistic != GlobalStatistics.CROWN_FUEL_CONSUMED && this.statistic != GlobalStatistics.RADIATIVE_POWER &&
              this.statistic != GlobalStatistics.HFI && this.statistic != GlobalStatistics.HCFB && this.statistic != GlobalStatistics.HROS_MAP && this.statistic != GlobalStatistics.FROS_MAP &&
              this.statistic != GlobalStatistics.BROS_MAP && this.statistic != GlobalStatistics.RSS_MAP && this.statistic != GlobalStatistics.RAZ_MAP && this.statistic != GlobalStatistics.FMC_MAP &&
              this.statistic != GlobalStatistics.CFB_MAP && this.statistic != GlobalStatistics.CFC_MAP && this.statistic != GlobalStatistics.SFC_MAP && this.statistic != GlobalStatistics.TFC_MAP &&
              this.statistic != GlobalStatistics.FI_MAP && this.statistic != GlobalStatistics.FL_MAP && this.statistic != GlobalStatistics.CURINGDEGREE_MAP && this.statistic != GlobalStatistics.GREENUP_MAP &&
              this.statistic != GlobalStatistics.PC_MAP && this.statistic != GlobalStatistics.PDF_MAP && this.statistic != GlobalStatistics.CBH_MAP && this.statistic != GlobalStatistics.TREE_HEIGHT_MAP &&
              this.statistic != GlobalStatistics.FUEL_LOAD_MAP && this.statistic != GlobalStatistics.CFL_MAP && this.statistic != GlobalStatistics.GRASSPHENOLOGY_MAP &&
              this.statistic != GlobalStatistics.ROSVECTOR_MAP && this.statistic != GlobalStatistics.DIRVECTOR_MAP &&
              this.statistic != GlobalStatistics.CRITICAL_PATH && this.statistic != GlobalStatistics.CRITICAL_PATH_PERCENTAGE) {
        
      errs.push(new ValidationError("statistic", "Invalid statistic specified for grid export.", this));
    }
    //catch an error where the interpolation method is restricted for the output statistic
    else if ((this.statistic === GlobalStatistics.TOTAL_FUEL_CONSUMED || this.statistic === GlobalStatistics.SURFACE_FUEL_CONSUMED ||
              this.statistic === GlobalStatistics.CROWN_FUEL_CONSUMED || this.statistic === GlobalStatistics.RADIATIVE_POWER) &&
              this.interpMethod !== Output_GridFileInterpolation.DISCRETIZED) {
      errs.push(new ValidationError("interpMethod", "Interpolation method must be discretized.", this));
    }
    
    let subscenarioErrs = new Array<ValidationError>();
    for (let i = 0; i < this.subScenarioOverrideTimes.length; i++) {
      let subscenario = this.subScenarioOverrideTimes[i].checkValid();
      if (subscenario.length > 0) {
        let temp = new ValidationError(i, `Errors found in sub-scenario override times at ${i}.`, this.subScenarioOverrideTimes);
        subscenario.forEach(err => {
          temp.addChild(err);
        });
        subscenarioErrs.push(temp);
      }
    }
    if (subscenarioErrs.length > 0) {
      let temp = new ValidationError("subScenarioOverrideTimes", "Errors found in sub-scenario override times.", this);
      subscenarioErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    
    return errs;
  }
  
  private static streamNullableString(value: string|null): string {
    return value || "";
  }
  
  /**
   * Streams the grid file to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    let tmp = this.scenarioName + '|' + this.filename + '|' + this._outputTime.toISO() + '|' + this.statistic + '|' + this.interpMethod + '|' + (+this.shouldStream) + '|' + this.compression;
    tmp = tmp + '|' + this.shouldMinimize + '|' + Output_GridFile.streamNullableString(this.subScenarioName) + '|' + this.subScenarioOverrideTimes.length;
    for (let e of this.subScenarioOverrideTimes) {
      tmp = tmp + '|' + e.subScenarioName + '|' + e.getExportOverrideTime();
    }
    if (this.discretize != null) {
      tmp = tmp + '|' + this.discretize;
    }
    else {
      tmp = tmp + '|null';
    }
    if (this._startOutputTime != null) {
      tmp = tmp + '|' + this._startOutputTime.toISO();
    }
    else {
      tmp = tmp + '|null';
    }
    tmp = tmp + '|non|null';
    if (this.assetName != null) {
      tmp = tmp + '|' + this.assetName;
    }
    else {
      tmp = tmp + '|null';
    }
    if (this.assetIndex != null) {
      tmp = tmp + '|' + this.assetIndex;
    }
    else {
      tmp = tmp + '|-1';
    }
    if (this.zeroForNodata) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    if (this.excludeInteriors) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    builder.write(Output_GridFile.PARAM_GRIDFILE + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

export enum VectorFileType {
  KML = "KML",
  SHP = "SHP"
}

/**
 * An override start and end time for a specific sub-scenario.
 */
export class PerimeterTimeOverride {
  /**
   * The name of the sub-scenario.
   */
  public subScenarioName: string;
  
  /**
   * The time to use instead of {@link VectorFile#perimStartTime}.
   */
  private _startTime: DateTime|null = null;
  /**
   * Get the override for the export start time as a Luxon DateTime.
   */
  get lStartTime(): DateTime|null {
    return this._startTime;
  }
  /**
   * Get the override for the export start time as an ISO8601 string.
   * @deprecated
   */
  get startTime(): string {
    return this.getExportStartTime();
  }
  /**
   * Set the override for the export start time using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lStartTime(value: DateTime|null) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The override for the export start time is not valid");
    }
    this._startTime = value;
  }
  /**
   * Set the override for the export start time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set startTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The override for the export start time is not valid");
    }
    this._startTime = DateTime.fromISO(value);
  }
  public getExportStartTime(): string {
    return this._startTime == null ? "" : this._startTime.toISO();
  }
  
  /**
   * The time to use instead of {@link VectorFile#perimEndTime}.
   */
  private _endTime: DateTime|null = null;
  /**
   * Get the override for the export end time as a Luxon DateTime.
   */
  get lEndTime(): DateTime|null {
    return this._endTime;
  }
  /**
   * Get the override for the export end time as an ISO8601 string.
   * @deprecated
   */
  get endTime(): string {
    return this.getExportEndTime();
  }
  /**
   * Set the override for the export end time using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lEndTime(value: DateTime|null) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The override for the export end time is not valid");
    }
    this._endTime = value;
  }
  /**
   * Set the override for the export end time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set endTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The override for the export end time is not valid");
    }
    this._endTime = DateTime.fromISO(value);
  }
  public getExportEndTime(): string {
    return this._endTime == null ? "" : this._endTime.toISO();
  }
  
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    
    if (this.subScenarioName == null) {
      errs.push(new ValidationError("subScenarioName", "No sub-scenario has been set.", this));
    }
    
    return errs;
  }
}

export class VectorFile {
  private static readonly PARAM_VECTORFILE = "vectorfile";
  
  /**
   * The name of the output file (required).
   * The file will be located below the jobs output directory. All global paths and
   * relative paths that attempt to move the file outside of this directory will be removed.
   */
  public filename: string = "";
  /**
   * The type of vector file to output (required).
   */
  public type: VectorFileType;
  /**
   * Whether multiple perimeters are needed (based on time steps) or only the final perimeter is needed (required).
   */
  public multPerim: boolean;
  /**
   * Start output perimeter time (required).
   */
  private _perimStartTime: DateTime;
  /**
   * Get the perimeter export start time as a Luxon DateTime.
   */
  get lPerimStartTime(): DateTime {
    return this._perimStartTime;
  }
  /**
   * Get the perimeter export start time as an ISO8601 string.
   * @deprecated
   */
  get perimStartTime(): string {
    return this._perimStartTime == null ? "" : this._perimStartTime.toISO();
  }
  /**
   * Set the perimeter export start time using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lPerimStartTime(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The perimeter export start time is not valid");
    }
    this._perimStartTime = value;
  }
  /**
   * Set the perimeter export start time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set perimStartTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The perimeter export start time is not valid");
    }
    this._perimStartTime = DateTime.fromISO(value);
  }
  /**
   * End output perimeter time (required).
   */
  private _perimEndTime: DateTime;
  /**
   * Get the override for the export end time as a Luxon DateTime.
   */
  get lPerimEndTime(): DateTime {
    return this._perimEndTime;
  }
  /**
   * Get the override for the export end time as an ISO8601 string.
   * @deprecated
   */
  get perimEndTime(): string {
    return this._perimEndTime == null ? "" : this._perimEndTime.toISO();
  }
  /**
   * Set the override for the export end time using a Luxon DateTime. Cannot be null.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   */
  set lPerimEndTime(value: DateTime) {
    if (SocketMsg.inlineThrowOnError && value == null) {
      throw new RangeError("The override for the export end time is not valid");
    }
    this._perimEndTime = value;
  }
  /**
   * Set the override for the export end time using a string. Cannot be null or empty. Must be formatted in ISO8601.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if value is not valid.
   * @deprecated
   */
  set perimEndTime(value: string) {
    if (SocketMsg.inlineThrowOnError && (value == null || value.length == 0)) {
      throw new RangeError("The override for the export end time is not valid");
    }
    this._perimEndTime = DateTime.fromISO(value);
  }
  /**
   * Remove unburned islands (holes) inside of the perimeter (required).
   */
  public removeIslands: boolean;
  /**
   * Dissolve contacting fires into a single perimeter (required).
   */
  public mergeContact: boolean;
  /**
   * Whether the exported file should contain only the active perimeter (required).
   */
  public perimActive: boolean;
  /**
   * The name of the scenario that this output is for (required).
   */
  public scenarioName: string = "";
  /**
   * Describes which metadata should be written to the vector file (required).
   */
  public metadata: VectorMetadata;
  /**
   * Should the file be streamed/uploaded to an external service after
   * it has been created? The streaming services are defined by
   * {@link OutputStreamInfo} and helper methods such as
   * {@link WISE#streamOutputToMqtt} or {@link WISE#streamOutputToGeoServer}.
   */
  public shouldStream: boolean;
  
  /**
   * The name of a sub-scenario to export instead of all sub-scenarios
   * being combined into a single output. Ignored if not using sub-scenarios.
   */
  public subScenarioName: string|null = null;
  /**
   * A list of times to override for specific sub-scenarios, if sub-scenarios
   * are being created for the referenced scenario.
   */
  private subScenarioOverrides: Array<PerimeterTimeOverride> = new Array<PerimeterTimeOverride>();
  public add_subScenarioOverrides(add: PerimeterTimeOverride): void {
    if (add != null) {
      this.subScenarioOverrides.push(add);
    }
  }
  public remove_subScenarioOverrides(remove: PerimeterTimeOverride): void {
    var ind = this.subScenarioOverrides.indexOf(remove);
    this.subScenarioOverrides.splice(ind, 1);
  }
  
  private static streamNullableBoolean(value: boolean|null): number {
    return value == null ? -1 : (value ? 1 : 0);
  }
  
  private static streamNullableString(value: string|null): string {
    return value == null ? "" : value;
  }
  
  public constructor() {
    this.metadata = new VectorMetadata();
    this.shouldStream = false;
  }
  
  /**
   * Checks to see if all required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this.filename.length == 0) {
      errs.push(new ValidationError("filename", "No output filename has been specified.", this));
    }
    if (this._perimStartTime == null) {
      errs.push(new ValidationError("lPerimStartTime", "The simulation time to begin outputting the perimeter for has not been specified.", this));
    }
    if (this._perimEndTime == null) {
      errs.push(new ValidationError("lPerimEndTime", "The simulation time to stop outputting the perimeter for has not been specified.", this));
    }
    if (this.scenarioName.length == 0) {
      errs.push(new ValidationError("scenarioName", "The scenario that the output is for has not been specified.", this));
    }
    if (this.type !== VectorFileType.KML && this.type !== VectorFileType.SHP) {
      errs.push(new ValidationError("type", "Invalid output file type specified.", this));
    }
    if (this.multPerim == null) {
      errs.push(new ValidationError("multPerim", "The multiple perimeter setting is invalid.", this));
    }
    if (this.removeIslands == null) {
      errs.push(new ValidationError("removeIslands", "The remove islands setting is invalid.", this));
    }
    if (this.mergeContact == null) {
      errs.push(new ValidationError("mergeContact", "The merge contacting perimeters setting is invalid.", this));
    }
    if (this.perimActive == null) {
      errs.push(new ValidationError("perimActive", "The active perimeter setting is invalid.", this));
    }
    
    let metadataErrs = this.metadata.checkValid();
    if (metadataErrs.length > 0) {
      let temp = new ValidationError("metadata", "Errors in vector file metadata settings.", this);
      metadataErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    
    let subscenarioErrs = new Array<ValidationError>();
    for (let i = 0; i < this.subScenarioOverrides.length; i++) {
      let subscenario = this.subScenarioOverrides[i].checkValid();
      if (subscenario.length > 0) {
        let temp = new ValidationError(i, `Errors found in sub-scenario overrides at ${i}.`, this.subScenarioName);
        subscenario.forEach(err => {
          temp.addChild(err);
        });
        subscenarioErrs.push(temp);
      }
    }
    if (subscenarioErrs.length > 0) {
      let temp = new ValidationError("subScenarioOverrides", "Errors in sub-scenario overrides.", this);
      subscenarioErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    
    return errs;
  }
  
  /**
   * Streams the vector file to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    let tmp = this.scenarioName + '|' + this.filename + '|' + (+this.multPerim) + '|' + this._perimStartTime.toISO() + '|' + this._perimEndTime.toISO() + '|' + (+this.removeIslands) + '|' + (+this.mergeContact) + '|' + (+this.perimActive);
    tmp = tmp + '|' + this.metadata.version + '|' + this.metadata.scenName + '|' + this.metadata.jobName + '|' + this.metadata.igName + '|' + this.metadata.simDate;
    tmp = tmp + '|' + this.metadata.fireSize + '|' + this.metadata.perimTotal + '|' + this.metadata.perimActive + '|' + this.metadata.perimUnit + '|' + this.metadata.areaUnit + '|' + (+this.shouldStream);
    tmp = tmp + '|' + VectorFile.streamNullableBoolean(this.metadata.wxValues) + '|' + VectorFile.streamNullableBoolean(this.metadata.fwiValues);
    tmp = tmp + '|' + VectorFile.streamNullableBoolean(this.metadata.ignitionLocation) + '|' + VectorFile.streamNullableBoolean(this.metadata.maxBurnDistance);
    tmp = tmp + '|' + VectorFile.streamNullableBoolean(this.metadata.ignitionAttributes) + '|' + VectorFile.streamNullableString(this.subScenarioName);
    tmp = tmp + '|' + this.subScenarioOverrides.length;
    for (let s of this.subScenarioOverrides) {
      tmp = tmp + '|' + s.subScenarioName + '|' + s.getExportStartTime() + '|' + s.getExportEndTime();
    }
    tmp = tmp + '|' + VectorFile.streamNullableBoolean(this.metadata.assetArrivalTime) + '|' + VectorFile.streamNullableBoolean(this.metadata.assetArrivalCount);
    tmp = tmp + '|' + VectorFile.streamNullableBoolean(this.metadata.identifyFinalPerimeter) + '|' + VectorFile.streamNullableBoolean(this.metadata.simStatus);
    builder.write(VectorFile.PARAM_VECTORFILE + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

/**
 * Output a summary for the specified scenario.
 * @author "Travis Redpath"
 */
export class SummaryFile {
  private static readonly PARAM_SUMMARYFILE = "summaryfile";
  
  /**
   * Which summary values should be output upon completion of the scenario.
   */
  public outputs: SummaryOutputs;
  /**
   * Should the file be streamed/uploaded to an external service after
   * it has been created? The streaming services are defined by
   * {@link OutputStreamInfo} and helper methods such as
   * {@link WISE#streamOutputToMqtt} or {@link WISE#streamOutputToGeoServer}.
   */
  public shouldStream: boolean;
  
  protected scenName: string;
  
  /**
   * The name of the output file.
   */
  public filename: string;
  
  /**
   * Create a new summary file.
   * @param scen The name of the scenario to output a summary for.
   */
  public constructor(scen: Scenario) {
    this.scenName = scen.getId();
    this.outputs = new SummaryOutputs();
    this.shouldStream = false;
  }
  
  /**
   * Determine if all of the required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the summary file output.
   * @returns A list of all errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this.filename.length == 0) {
      errs.push(new ValidationError("filename", "The output filename was not specified.", this));
    }
    if (this.scenName.length == 0) {
      errs.push(new ValidationError("scenName", "The scenario that the output is for has not been specified.", this));
    }
    let outputsErrs = this.outputs.checkValid();
    if (outputsErrs.length > 0) {
      let temp = new ValidationError("outputs", "Errors found in the summary output settings.", this);
      outputsErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    return errs;
  }
  
  /**
   * Streams the summary options to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    let tmp = this.scenName + '|' + this.filename;
    
    if (this.outputs.outputApplication == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputApplication) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    if (this.outputs.outputGeoData == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputGeoData) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    if (this.outputs.outputScenario == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputScenario) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    if (this.outputs.outputScenarioComments == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputScenarioComments) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    if (this.outputs.outputInputs == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputInputs) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    if (this.outputs.outputLandscape == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputLandscape) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    if (this.outputs.outputFBPPatches == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputFBPPatches) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    if (this.outputs.outputWxPatches == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputWxPatches) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    if (this.outputs.outputIgnitions == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputIgnitions) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    if (this.outputs.outputWxStreams == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputWxStreams) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    if (this.outputs.outputFBP == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputFBP) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    tmp = tmp + '|' + (+this.shouldStream);
    
    if (this.outputs.outputWxData == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputWxData) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    if (this.outputs.outputAssetInfo == null) {
      tmp = tmp + '|-1';
    }
    else if (this.outputs.outputAssetInfo) {
      tmp = tmp + '|1';
    }
    else {
      tmp = tmp + '|0';
    }
    
    builder.write(SummaryFile.PARAM_SUMMARYFILE + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

/**
 * The filetype of the exported stats file.
 */
export enum StatsFileType {
  /**
   * Detect the output type based on the file extension.  *.json will
   * always be {@see JSON_ROW}.
   */
  AUTO_DETECT = 0,
  /**
   * Export to a CSV file.
   */
  COMMA_SEPARATED_VALUE = 1,
  /**
   * Export to a JSON file with the data separated by timestep.
   */
  JSON_ROW = 2,
  /**
   * Export to a JSON file with the data separated by statistic.
   */
  JSON_COLUMN = 3
}

/**
 * An output file to mimic the Prometheus stats view. Contains
 * stats from each timestep of a scenarios simulation.
 */
export class StatsFile {
  private static readonly PARAM_STATSFILE = "statsfile";
  
  /**
   * Should the file be streamed/uploaded to an external service after
   * it has been created? The streaming services are defined by
   * {@link OutputStreamInfo} and helper methods such as
   * {@link WISE#streamOutputToMqtt} or {@link WISE#streamOutputToGeoServer}.
   */
  public shouldStream: boolean;
  
  protected scenName: string;
  
  public streamName: string|null = null;
  
  public location: LatLon|null = null;
  
  /**
   * The name of the output file.
   */
  public filename: string;
  
  /**
   * The file format to export to.
   */
  public fileType: StatsFileType = StatsFileType.AUTO_DETECT;
  
  /**
   * An array of {@link GlobalStatistics} that dictates which statistics
   * will be added to the file.
   */
  public columns = new Array<GlobalStatistics>();
  /**
   * The amount to discritize the existing grid to (optional).
   * Must be in [1, 1000].
   */
  public discretize: number|null = null;
  
  /**
   * Create a new stats file.
   * @param scen The name of the scenario to output a stats file for.
   */
  public constructor(scen: Scenario) {
    this.scenName = scen.getId();
    this.shouldStream = false;
  }
  
  /**
   * Set a location to use for exporting weather information to the stats file.
   * Either this or {@link setWeatherStream} should be used if weather information
   * is to be added to the stats file.
   * @param location The location that will be used for exporting weather information.
   */
  public setLocation(location: LatLon) {
    this.streamName = null;
    this.location = location;
  }
  
  /**
   * Set a weather stream to use for exporting weather information to the stats file.
   * Either this or {@link setLocation} should be used if weather information
   * is to be added to the stats file.
   * @param stream A weather stream that will be used for exporting weather information.
   */
  public setWeatherStream(stream: WeatherStream) {
    this.location = null;
    this.streamName = stream.getId();
  }
  
  /**
   * Add a new column to output in the statistics file.
   * @param col The new column to add.
   * @returns The column that was added, or null if the column was invalid or had already been added.
   */
  public addColumn(col: GlobalStatistics.DATE_TIME | GlobalStatistics.ELAPSED_TIME | GlobalStatistics.TIME_STEP_DURATION |
                        GlobalStatistics.TEMPERATURE | GlobalStatistics.DEW_POINT | GlobalStatistics.RELATIVE_HUMIDITY |
                        GlobalStatistics.WIND_SPEED | GlobalStatistics.WIND_DIRECTION | GlobalStatistics.PRECIPITATION |
                        GlobalStatistics.HFFMC | GlobalStatistics.HISI | GlobalStatistics.DMC |
                        GlobalStatistics.DC | GlobalStatistics.HFWI | GlobalStatistics.BUI |
                        GlobalStatistics.FFMC | GlobalStatistics.ISI | GlobalStatistics.FWI |
                        GlobalStatistics.TIMESTEP_AREA | GlobalStatistics.TIMESTEP_BURN_AREA | GlobalStatistics.TOTAL_AREA |
                        GlobalStatistics.TOTAL_BURN_AREA | GlobalStatistics.AREA_GROWTH_RATE | GlobalStatistics.EXTERIOR_PERIMETER |
                        GlobalStatistics.EXTERIOR_PERIMETER_GROWTH_RATE | GlobalStatistics.ACTIVE_PERIMETER | GlobalStatistics.ACTIVE_PERIMETER_GROWTH_RATE |
                        GlobalStatistics.TOTAL_PERIMETER | GlobalStatistics.TOTAL_PERIMETER_GROWTH_RATE | GlobalStatistics.FI_LT_10 |
                        GlobalStatistics.FI_10_500 | GlobalStatistics.FI_500_2000 | GlobalStatistics.FI_2000_4000 |
                        GlobalStatistics.FI_4000_10000 | GlobalStatistics.FI_GT_10000 | GlobalStatistics.ROS_0_1 |
                        GlobalStatistics.ROS_2_4 | GlobalStatistics.ROS_5_8 | GlobalStatistics.ROS_9_14 |
                        GlobalStatistics.ROS_GT_15 | GlobalStatistics.MAX_ROS | GlobalStatistics.MAX_FI |
                        GlobalStatistics.MAX_FL | GlobalStatistics.MAX_CFB | GlobalStatistics.MAX_CFC |
                        GlobalStatistics.MAX_SFC | GlobalStatistics.MAX_TFC | GlobalStatistics.TOTAL_FUEL_CONSUMED |
                        GlobalStatistics.CROWN_FUEL_CONSUMED | GlobalStatistics.SURFACE_FUEL_CONSUMED | GlobalStatistics.NUM_ACTIVE_VERTICES |
                        GlobalStatistics.NUM_VERTICES | GlobalStatistics.CUMULATIVE_VERTICES | GlobalStatistics.CUMULATIVE_ACTIVE_VERTICES |
                        GlobalStatistics.NUM_ACTIVE_FRONTS | GlobalStatistics.NUM_FRONTS | GlobalStatistics.MEMORY_USED_START |
                        GlobalStatistics.MEMORY_USED_END | GlobalStatistics.NUM_TIMESTEPS | GlobalStatistics.NUM_DISPLAY_TIMESTEPS |
                        GlobalStatistics.NUM_EVENT_TIMESTEPS | GlobalStatistics.NUM_CALC_TIMESTEPS | GlobalStatistics.TICKS |
                        GlobalStatistics.PROCESSING_TIME | GlobalStatistics.GROWTH_TIME): GlobalStatistics|null {
    
    if (col == GlobalStatistics.DATE_TIME || col == GlobalStatistics.ELAPSED_TIME || col == GlobalStatistics.TIME_STEP_DURATION ||
        col == GlobalStatistics.TEMPERATURE || col == GlobalStatistics.DEW_POINT || col == GlobalStatistics.RELATIVE_HUMIDITY ||
        col == GlobalStatistics.WIND_SPEED || col == GlobalStatistics.WIND_DIRECTION || col == GlobalStatistics.PRECIPITATION ||
        col == GlobalStatistics.HFFMC || col == GlobalStatistics.HISI || col == GlobalStatistics.DMC ||
        col == GlobalStatistics.DC || col == GlobalStatistics.HFWI || col == GlobalStatistics.BUI ||
        col == GlobalStatistics.FFMC || col == GlobalStatistics.ISI || col == GlobalStatistics.FWI ||
        col == GlobalStatistics.TIMESTEP_AREA || col == GlobalStatistics.TIMESTEP_BURN_AREA || col == GlobalStatistics.TOTAL_AREA ||
        col == GlobalStatistics.TOTAL_BURN_AREA || col == GlobalStatistics.AREA_GROWTH_RATE || col == GlobalStatistics.EXTERIOR_PERIMETER ||
        col == GlobalStatistics.EXTERIOR_PERIMETER_GROWTH_RATE || col == GlobalStatistics.ACTIVE_PERIMETER || col == GlobalStatistics.ACTIVE_PERIMETER_GROWTH_RATE ||
        col == GlobalStatistics.TOTAL_PERIMETER || col == GlobalStatistics.TOTAL_PERIMETER_GROWTH_RATE || col == GlobalStatistics.FI_LT_10 ||
        col == GlobalStatistics.FI_10_500 || col == GlobalStatistics.FI_500_2000 || col == GlobalStatistics.FI_2000_4000 ||
        col == GlobalStatistics.FI_4000_10000 || col == GlobalStatistics.FI_GT_10000 || col == GlobalStatistics.ROS_0_1 ||
        col == GlobalStatistics.ROS_2_4 || col == GlobalStatistics.ROS_5_8 || col == GlobalStatistics.ROS_9_14 ||
        col == GlobalStatistics.ROS_GT_15 || col == GlobalStatistics.MAX_ROS || col == GlobalStatistics.MAX_FI ||
        col == GlobalStatistics.MAX_FL || col == GlobalStatistics.MAX_CFB || col == GlobalStatistics.MAX_CFC ||
        col == GlobalStatistics.MAX_SFC || col == GlobalStatistics.MAX_TFC || col == GlobalStatistics.TOTAL_FUEL_CONSUMED ||
        col == GlobalStatistics.CROWN_FUEL_CONSUMED || col == GlobalStatistics.SURFACE_FUEL_CONSUMED || col == GlobalStatistics.NUM_ACTIVE_VERTICES ||
        col == GlobalStatistics.NUM_VERTICES || col == GlobalStatistics.CUMULATIVE_VERTICES || col == GlobalStatistics.CUMULATIVE_ACTIVE_VERTICES ||
        col == GlobalStatistics.NUM_ACTIVE_FRONTS || col == GlobalStatistics.NUM_FRONTS || col == GlobalStatistics.MEMORY_USED_START ||
        col == GlobalStatistics.MEMORY_USED_END || col == GlobalStatistics.NUM_TIMESTEPS || col == GlobalStatistics.NUM_DISPLAY_TIMESTEPS ||
        col == GlobalStatistics.NUM_EVENT_TIMESTEPS || col == GlobalStatistics.NUM_CALC_TIMESTEPS || col == GlobalStatistics.TICKS ||
        col == GlobalStatistics.PROCESSING_TIME || col == GlobalStatistics.GROWTH_TIME) {
      if (this.columns.indexOf(col) < 0) {
        this.columns.push(col);
        return col;
      }
    }
    return null;
  }
  
  /**
   * Remove a column for the statistics file.
   */
  public removeColumn(col: GlobalStatistics): boolean {
    var index = this.columns.indexOf(col);
    if (index != -1) {
      this.columns.splice(index, 1);
      return true;
    }
    return false;
  }
  
  private validateColumn(value: GlobalStatistics): boolean {
    if (value != GlobalStatistics.DATE_TIME && value != GlobalStatistics.ELAPSED_TIME && value != GlobalStatistics.TIME_STEP_DURATION &&
        value != GlobalStatistics.TEMPERATURE && value != GlobalStatistics.DEW_POINT && value != GlobalStatistics.RELATIVE_HUMIDITY &&
        value != GlobalStatistics.WIND_SPEED && value != GlobalStatistics.WIND_DIRECTION && value != GlobalStatistics.PRECIPITATION &&
        value != GlobalStatistics.HFFMC && value != GlobalStatistics.HISI && value != GlobalStatistics.DMC &&
        value != GlobalStatistics.DC && value != GlobalStatistics.HFWI && value != GlobalStatistics.BUI &&
        value != GlobalStatistics.FFMC && value != GlobalStatistics.ISI && value != GlobalStatistics.FWI &&
        value != GlobalStatistics.TIMESTEP_AREA && value != GlobalStatistics.TIMESTEP_BURN_AREA && value != GlobalStatistics.TOTAL_AREA &&
        value != GlobalStatistics.TOTAL_BURN_AREA && value != GlobalStatistics.AREA_GROWTH_RATE && value != GlobalStatistics.EXTERIOR_PERIMETER &&
        value != GlobalStatistics.EXTERIOR_PERIMETER_GROWTH_RATE && value != GlobalStatistics.ACTIVE_PERIMETER && value != GlobalStatistics.ACTIVE_PERIMETER_GROWTH_RATE &&
        value != GlobalStatistics.TOTAL_PERIMETER && value != GlobalStatistics.TOTAL_PERIMETER_GROWTH_RATE && value != GlobalStatistics.FI_LT_10 &&
        value != GlobalStatistics.FI_10_500 && value != GlobalStatistics.FI_500_2000 && value != GlobalStatistics.FI_2000_4000 &&
        value != GlobalStatistics.FI_4000_10000 && value != GlobalStatistics.FI_GT_10000 && value != GlobalStatistics.ROS_0_1 &&
        value != GlobalStatistics.ROS_2_4 && value != GlobalStatistics.ROS_5_8 && value != GlobalStatistics.ROS_9_14 &&
        value != GlobalStatistics.ROS_GT_15 && value != GlobalStatistics.MAX_ROS && value != GlobalStatistics.MAX_FI &&
        value != GlobalStatistics.MAX_FL && value != GlobalStatistics.MAX_CFB && value != GlobalStatistics.MAX_CFC &&
        value != GlobalStatistics.MAX_SFC && value != GlobalStatistics.MAX_TFC && value != GlobalStatistics.TOTAL_FUEL_CONSUMED &&
        value != GlobalStatistics.CROWN_FUEL_CONSUMED && value != GlobalStatistics.SURFACE_FUEL_CONSUMED && value != GlobalStatistics.NUM_ACTIVE_VERTICES &&
        value != GlobalStatistics.NUM_VERTICES && value != GlobalStatistics.CUMULATIVE_VERTICES && value != GlobalStatistics.CUMULATIVE_ACTIVE_VERTICES &&
        value != GlobalStatistics.NUM_ACTIVE_FRONTS && value != GlobalStatistics.NUM_FRONTS && value != GlobalStatistics.MEMORY_USED_START &&
        value != GlobalStatistics.MEMORY_USED_END && value != GlobalStatistics.NUM_TIMESTEPS && value != GlobalStatistics.NUM_DISPLAY_TIMESTEPS &&
        value != GlobalStatistics.NUM_EVENT_TIMESTEPS && value != GlobalStatistics.NUM_CALC_TIMESTEPS && value != GlobalStatistics.TICKS &&
        value != GlobalStatistics.PROCESSING_TIME && value != GlobalStatistics.GROWTH_TIME) {
      
      return false;
    }
    return true;
  }
  
  /**
   * Determine if all of the required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may be in the statistics file output.
   * @returns A list of all errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this.filename.length == 0) {
      errs.push(new ValidationError("filename", "The output filename was not specified.", this));
    }
    if (this.scenName.length == 0) {
      errs.push(new ValidationError("scenName", "The scenario that the output is for has not been specified.", this));
    }
    let columnErrs = new Array<ValidationError>();
    for (let i = 0; i < this.columns.length; i++) {
      if (!this.validateColumn(this.columns[i])) {
        columnErrs.push(new ValidationError(i, `Invalid statistics column at ${i}.`, this.columns));
      }
    }
    if (columnErrs.length > 0) {
      let temp = new ValidationError("columns", "Invalid statistics columns.", this);
      columnErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    if (this.discretize != null && (this.discretize < 1 || this.discretize > 1000)) {
      errs.push(new ValidationError("discritize", "The discritization must be an integer greater than 0 and less than 1001.", this));
    }
    return errs;
  }
  
  /**
   * Streams the stats options to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    let tmp = this.scenName + '|' + this.filename + '|' + this.fileType + '|' + (+this.shouldStream);
    
    if (this.location != null) {
      tmp = tmp + '|loc|' + this.location.latitude + '|' + this.location.longitude;
    }
    else {
      tmp = tmp + '|name|' + this.streamName;
    }
    tmp = tmp + '|0|' + this.columns.length;
    for (let col of this.columns) {
      tmp = tmp + '|' + col;
    }
    if (this.discretize == null) {
      tmp = tmp + '|null'
    }
    else {
      tmp = tmp + '|' + this.discretize;
    }
    
    builder.write(StatsFile.PARAM_STATSFILE + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

/**
 * Statistics for asset files.
 */
export class AssetStatsFile {
  private static readonly PARAM_STATSFILE = "asset_stats_export";
  
  /**
   * Should the file be streamed/uploaded to an external service after
   * it has been created? The streaming services are defined by
   * {@link OutputStreamInfo} and helper methods such as
   * {@link WISE#streamOutputToMqtt} or {@link WISE#streamOutputToGeoServer}.
   */
  public shouldStream: boolean;
  
  protected scenName: string;
  
  /**
   * The name of the output file.
   */
  public filename: string;
  
  /**
   * The file format to export to.
   */
  public fileType: StatsFileType = StatsFileType.AUTO_DETECT;
  
  /**
   * Embed critical path data inside the stats file.
   */
  public criticalPathEmbedded: boolean = false;
  
  /**
   * Export a separate file with critical paths in it.
   */
  public criticalPathPath: string|null = null;
  
  /**
   * Create a new stats file.
   * @param scen The name of the scenario to output a stats file for.
   */
  public constructor(scen: Scenario) {
    this.scenName = scen.getId();
    this.shouldStream = false;
  }
  
  /**
   * Determine if all of the required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may be in the statistics file output.
   * @returns A list of all errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    if (this.filename.length == 0) {
      errs.push(new ValidationError("filename", "The output filename was not specified.", this));
    }
    if (this.scenName.length == 0) {
      errs.push(new ValidationError("scenName", "The scenario that the output is for has not been specified.", this));
    }
    return errs;
  }
  
  /**
   * Streams the stats options to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    let tmp = this.scenName + '|' + this.filename + '|' + this.fileType + '|' + (+this.shouldStream) + '|' + (+this.criticalPathEmbedded);
    
    if (this.criticalPathPath != null) {
      tmp = tmp + '|' + this.criticalPathPath;
    }
    else {
      tmp = tmp + '|null';
    }
    
    builder.write(AssetStatsFile.PARAM_STATSFILE + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

/**
 * Information about which files should be output from the job.
 * @author "Travis Redpath"
 */
export class WISEOutputs {
  /**
   * The vector files that should be output (optional).
   */
  public vectorFiles = new Array<VectorFile>();
  /**
   * The grid files that should be output (optional).
   */
  public gridFiles = new Array<Output_GridFile>();
  /**
   * The fuel grid files that should be output (optional).
   */
  public fuelGridFiles = new Array<Output_FuelGridFile>();
  /**
   * The summary files that should be output (optional).
   */
  public summaryFiles = new Array<SummaryFile>();
  /**
   * Output a stats file with information from each scenario timestep.
   */
  public statsFiles = new Array<StatsFile>();
  /**
   * Output a stats file with information about a specific asset.
   */
  public assetStatsFiles = new Array<AssetStatsFile>();
  
  /**
   * The default stream status for all newly created output
   * files. If true, newly created output files will be
   * defaulted to streaming to any specified stream
   * locations. If false, newly created output files will
   * be defaulted to not stream. The user can override
   * this setting on each output file.
   */
  public streamAll = false;
  
  public constructor() {
  }
  
  /**
   * Create a new vector file and add it to the list of
   * vector file outputs.
   */
  public newVectorFile(scen: Scenario): VectorFile {
    let file = new VectorFile();
    file.scenarioName = scen.getId();
    file.shouldStream = this.streamAll;
    this.vectorFiles.push(file);
    return file;
  }
  
  /**
   * Removes the output vector file from a scenario
   */
  public removeOutputVectorFile(stat: VectorFile): boolean {
    var index = this.vectorFiles.indexOf(stat);
    if (index != -1) {
      this.vectorFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Create a new grid file and add it to the list of
   * grid file outputs.
   */
  public newGridFile(scen: Scenario): Output_GridFile {
    let file = new Output_GridFile();
    file.scenarioName = scen.getId();
    file.shouldStream = this.streamAll;
    this.gridFiles.push(file);
    return file;
  }
  
  /**
   * Removes the output grid file from a scenario
   */
  public removeOutputGridFile(stat: Output_GridFile): boolean {
    var index = this.gridFiles.indexOf(stat);
    if (index != -1) {
      this.gridFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Create a new fuel grid file and add it to the list of
   * fuel grid file outputs.
   */
  public newFuelGridFile(scen: Scenario): Output_FuelGridFile {
    let file = new Output_FuelGridFile();
    file.scenarioName = scen.getId();
    file.shouldStream = this.streamAll;
    this.fuelGridFiles.push(file);
    return file;
  }
  
  /**
   * Removes the output fuel grid file from a scenario
   */
  public removeOutputFuelGridFile(stat: Output_FuelGridFile): boolean {
    var index = this.fuelGridFiles.indexOf(stat);
    if (index != -1) {
      this.fuelGridFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Create a new summary file and add it to the list of
   * summary file outputs.
   */
  public newSummaryFile(scen: Scenario): SummaryFile {
    let file = new SummaryFile(scen);
    file.shouldStream = this.streamAll;
    this.summaryFiles.push(file);
    return file;
  }
  
  /**
   * Removes the output summary file from a scenario
   */
  public removeOutputSummaryFile(stat: SummaryFile): boolean {
    var index = this.summaryFiles.indexOf(stat);
    if (index != -1) {
      this.summaryFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Create a new stats file and add it to the list of
   * stats file outputs.
   * @param scen The scenario to output the stats for.
   */
  public newStatsFile(scen: Scenario): StatsFile {
    let file = new StatsFile(scen);
    file.shouldStream = this.streamAll;
    this.statsFiles.push(file);
    return file;
  }
  
  /**
   * Remove a stats file from the scenario.
   * @param stat The stats file to remove.
   */
  public removeOutputStatsFile(stat: StatsFile): boolean {
    var index = this.statsFiles.indexOf(stat);
    if (index != -1) {
      this.statsFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Create a new Asset stats file and add it to the list of
   * asset stats file outputs.
   * @param scen The scenario to output the stats for.
   */
  public newAssetStatsFile(scen: Scenario): AssetStatsFile {
    let file = new AssetStatsFile(scen);
    file.shouldStream = this.streamAll;
    this.assetStatsFiles.push(file);
    return file;
  }
  
  /**
   * Remove an asset stats file from the scenario.
   * @param stat The stats file to remove.
   */
  public removeOutputAssetStatsFile(stat: AssetStatsFile): boolean {
    var index = this.assetStatsFiles.indexOf(stat);
    if (index != -1) {
      this.assetStatsFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Checks to see if all of the required values have been set.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Find all errors that may exist in the W.I.S.E. outputs.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    let summaryErrs = new Array<ValidationError>();
    for (let i = 0; i < this.summaryFiles.length; i++) {
      let summary = this.summaryFiles[i].checkValid();
      if (summary.length > 0) {
        let temp = new ValidationError(i, `Errors found in summary file at ${i}.`, this.summaryFiles);
        summary.forEach(err => {
          temp.addChild(err);
        });
        summaryErrs.push(temp);
      }
    }
    if (summaryErrs.length > 0) {
      let temp = new ValidationError("summaryFiles", "Errors found in summary file outputs.", this);
      summaryErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    
    let vectorErrs = new Array<ValidationError>();
    for (let i = 0; i < this.vectorFiles.length; i++) {
      let vector = this.vectorFiles[i].checkValid();
      if (vector.length > 0) {
        let temp = new ValidationError(i, `Errors found in vector file at ${i}.`, this.vectorFiles);
        vector.forEach(err => {
          temp.addChild(err);
        });
        vectorErrs.push(temp);
      }
    }
    if (vectorErrs.length > 0) {
      let temp = new ValidationError("vectorFiles", "Errors found in vector file outputs.", this);
      vectorErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    
    let gridErrs = new Array<ValidationError>();
    for (let i = 0; i < this.gridFiles.length; i++) {
      let grid = this.gridFiles[i].checkValid();
      if (grid.length > 0) {
        let temp = new ValidationError(i, `Errors found in grid file at ${i}.`, this.gridFiles);
        grid.forEach(err => {
          temp.addChild(err);
        });
        gridErrs.push(temp);
      }
    }
    if (gridErrs.length > 0) {
      let temp = new ValidationError("gridFiles", "Errors found in grid file outputs.", this);
      gridErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    
    let fuelGridErrs = new Array<ValidationError>();
    for (let i = 0; i < this.fuelGridFiles.length; i++) {
      let grid = this.fuelGridFiles[i].checkValid();
      if (grid.length > 0) {
        let temp = new ValidationError(i, `Errors found in fuel grid file at ${i}.`, this.fuelGridFiles);
        grid.forEach(err => {
          temp.addChild(err);
        });
        fuelGridErrs.push(temp);
      }
    }
    if (fuelGridErrs.length > 0) {
      let temp = new ValidationError("fuelGridFiles", "Errors found in fuel grid file outputs.", this);
      fuelGridErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    
    let statErrs = new Array<ValidationError>();
    for (let i = 0; i < this.statsFiles.length; i++) {
      let stats = this.statsFiles[i].checkValid();
      if (stats.length > 0) {
        let temp = new ValidationError(i, `Errors found in statistics file at ${i}.`, this.statsFiles);
        stats.forEach(err => {
          temp.addChild(err);
        });
        statErrs.push(temp);
      }
    }
    if (statErrs.length > 0) {
      let temp = new ValidationError("statsFiles", "Errors found in statistics file outputs.", this);
      statErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    
    let assetStatErrs = new Array<ValidationError>();
    for (let i = 0; i < this.assetStatsFiles.length; i++) {
      let stats = this.assetStatsFiles[i].checkValid();
      if (stats.length > 0) {
        let temp = new ValidationError(i, `Errors found in asset statistics file at ${i}.`, this.assetStatsFiles);
        stats.forEach(err => {
          temp.addChild(err);
        });
        assetStatErrs.push(temp);
      }
    }
    if (assetStatErrs.length > 0) {
      let temp = new ValidationError("assetStatsFiles", "Errors found in asset statistics file outputs.", this);
      assetStatErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    
    return errs;
  }
  
  /**
   * Streams the output settings to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    for (let s of this.summaryFiles) {
      s.stream(builder);
    }
    for (let v of this.vectorFiles) {
      v.stream(builder);
    }
    for (let g of this.gridFiles) {
      g.stream(builder);
    }
    for (let f of this.fuelGridFiles) {
      f.stream(builder);
    }
    for (let s of this.statsFiles) {
      s.stream(builder);
    }
    for (let s of this.assetStatsFiles) {
      s.stream(builder);
    }
  }
}

/**
 * After all simulations have completed the output files can be streamed to another
 * location to be consumed by a client side application. Currently only streaming
 * over MQTT is supported.
 * @author "Travis Redpath"
 */
export abstract class OutputStreamInfo extends IWISESerializable {
  protected static readonly PARAM_URL = "output_stream";
  
  /**
   * Find all errors in the stream settings.
   * @returns A list of all errors that were found.
   */
  public abstract checkValid(): Array<ValidationError>;
  
  public abstract stream(builder: net.Socket): void;
}


export class MqttOutputStreamInfo extends OutputStreamInfo {
  
  /**
   * @inheritdoc
   */
  public checkValid(): Array<ValidationError> {
    return [];
  }
  
  /**
   * Streams the output stream information to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    builder.write(OutputStreamInfo.PARAM_URL + SocketMsg.NEWLINE);
    builder.write("mqtt" + SocketMsg.NEWLINE);
  }
}

/**
 * After a file has been written by W.I.S.E. it can be uploaded to a GeoServer
 * instance by Manager. Currently only TIFF files are supported.
 */
export class GeoServerOutputStreamInfo extends OutputStreamInfo {
  /**
   * The username to authenticate on GeoServer with.
   */
  public username: string = "";
  
  /**
   * A password to authenticate on GeoServer with.
   * WARNING: this password will be saved in plain text.
   */
  public password: string = "";
  
  /**
   * The URL of the GeoServer instance to upload the file to.
   * The address of the REST API should be {url}/rest and the
   * URL of the web interface should be {url}/web.
   */
  public url: string = "";
  
  /**
   * The workspace to add the file to.
   * If the workspace doesn't exist it will be created.
   */
  public workspace: string = "";
  
  /**
   * The coverage store to add the file to.
   * If the coverage store doesn't exist it will be created.
   */
  public coverageStore: string = "";
  
  /**
   * The declared spatial reference system for the added coverage.
   * If this is not specified the uploaded coverage will not be
   * enabled.
   */
  public declaredSrs: string|null = null;
  
  /**
   * @inheritdoc
   */
  public checkValid(): Array<ValidationError> {
    const errs = new Array<ValidationError>();
    
    if (this.username == null || this.username.length == 0) {
      errs.push(new ValidationError("username", "No login username for the GeoServer instance was specified.", this));
    }
    if (this.password == null || this.password.length == 0) {
      errs.push(new ValidationError("password", "No login password for the GeoServer instance was specified.", this));
    }
    if (this.url == null || this.url.length == 0) {
      errs.push(new ValidationError("password", "No login password for the GeoServer instance was specified.", this));
    }
    if (this.workspace == null || this.workspace.length == 0) {
      errs.push(new ValidationError("password", "No GeoServer workspace to store the exported files in was specified.", this));
    }
    if (this.coverageStore == null || this.coverageStore.length == 0) {
      errs.push(new ValidationError("password", "No GeoServer coverage store inside the workspace to store the exported files in was specified.", this));
    }
    
    return errs;
  }
  
  /**
   * Streams the outptu stream information to a socket.
   */
  public stream(builder: net.Socket): void {
    builder.write(OutputStreamInfo.PARAM_URL + SocketMsg.NEWLINE);
    builder.write(`geo|${this.username}|${this.password}|${this.url}|${this.workspace}|${this.coverageStore}|${this.declaredSrs == null ? "" : this.declaredSrs}` + SocketMsg.NEWLINE);
  }
}

/**
 * Stores file contents for use in the simulation. All file
 * names must begin with `attachment:/`.
 */
class FileAttachment {
  private static readonly PARAM_ATTACHMENT = "file_attachment";
  private static readonly PARAM_ATTACHMENT_END = "file_attachment_end";
  
  /**
   * The name of the file.
   */
  public filename: string;
  
  /**
   * The raw file contents.
   */
  public contents: string|Buffer;
  
  /**
   * Create a new file stream.
   * @param name The name of the file.
   * @param content The raw contents of the file. If the content is being constructed
   * manually this can be a string (ex. weather stream constructed from external sources).
   * If this is a file it is recommended that a Buffer be used.
   */
  public constructor(name: string, content: string|Buffer) {
    this.filename = name;
    this.contents = content;
  }
  
  /**
   * Streams the attachment to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    builder.write(FileAttachment.PARAM_ATTACHMENT + SocketMsg.NEWLINE);
    if (Buffer.isBuffer(this.contents)) {
      builder.write(`${this.filename}|${this.contents.length}${SocketMsg.NEWLINE}`);
    }
    else {
      builder.write(this.filename + SocketMsg.NEWLINE);
    }
    
    builder.write(this.contents);
    builder.write(SocketMsg.NEWLINE);
    
    builder.write(FileAttachment.PARAM_ATTACHMENT_END + SocketMsg.NEWLINE);
  }
}

export enum TimeUnit {
  DEFAULT = -1,
  MICROSECOND = 0x00180000,
  MILLISECOND = 0x00190000,
  SECOND = 0x00110000,
  MINUTE = 0x00120000,
  HOUR = 0x00130000,
  DAY = 0x00140000,
  WEEK = 0x00150000,
  MONTH = 0x00160000,
  YEAR = 0x00170000,
  DECADE = 0x001a0000,
  CENTURY = 0x001b0000
}

export enum DistanceUnit {
  DEFAULT = -1,
  MM = 0x00000001,
  CM = 0x00000002,
  M = 0x00000003,
  KM = 0x00000004,
  INCH = 0x00000005,
  FOOT = 0x00000006,
  YARD = 0x00000007,
  CHAIN = 0x00000008,
  MILE = 0x00000009,
  NAUTICAL_MILE = 0x0000000a,
  NAUTICAL_MILE_UK = 0x0000000b
}

export enum AreaUnit {
  DEFAULT = -1,
  MM2 = 0x00000100,
  CM2 = 0x00000101,
  M2 = 0x00000102,
  HECTARE = 0x00000103,
  KM2 = 0x00000104,
  IN2 = 0x00000105,
  FT2 = 0x00000106,
  YD2 = 0x00000107,
  ACRE = 0x00000108,
  MILE2 = 0x00000109
}

export enum VolumeUnit {
  DEFAULT = -1,
  MM3 = 0x00000200,
  CM3 = 0x00000201,
  LITRE = 0x00000202,
  M3 = 0x00000203,
  KM3 = 0x00000204,
  IN3 = 0x00000205,
  FT3 = 0x00000206,
  YD3 = 0x00000207,
  MILE3 = 0x00000208,
  UK_FL_OZ = 0x00000209,
  UK_PINT = 0x0000020a,
  UK_QUART = 0x0000020b,
  UK_GALLON = 0x0000020c,
  BUSHEL = 0x0000020d,
  US_DRAM = 0x0000020e,
  US_FL_OZ = 0x0000020f,
  US_FL_PINT = 0x00000210,
  US_FL_QUART = 0x00000211,
  US_GALLON = 0x00000212,
  US_FL_BARREL = 0x00000213,
  US_DRY_PINT = 0x00000214,
  US_DRY_QUART = 0x00000215,
  US_DRY_BARREL = 0x00000216
}

export enum TemperatureUnit {
  DEFAULT = -1,
  KELVIN = 0x00000400,
  CELSIUS = 0x00000401,
  FAHRENHEIT = 0x00000402,
  RANKINE = 0x00000403
}

export enum PressureUnit {
  DEFAULT = -1,
  KPA = 0x00000500,
  PSI = 0x00000501,
  BAR = 0x00000502,
  ATM = 0x00000503,
  TORR = 0x00000504
}

export enum MassUnit {
  DEFAULT = -1,
  MILLIGRAM = 0x00000600,
  GRAM = 0x00000601,
  KG = 0x00000602,
  TONNE = 0x00000603,
  OUNCE = 0x00000604,
  LB = 0x00000605,
  SHORT_TON = 0x00000606,
  TON = 0x00000607
}

export enum EnergyUnit {
  DEFAULT = -1,
  JOULE = 0x00000700,
  KILOJOULE = 0x0000070a,
  ELECTRONVOLT = 0x00000701,
  ERG = 0x00000702,
  FT_LB = 0x00000703,
  CALORIE = 0x00000704,
  KG_METRE = 0x00000705,
  BTU = 0x00000706,
  WATT_SECOND = 0x00110707,
  WATT_HOUR = 0x00130707,
  KILOWATT_SECOND = 0x00110708,
  KILOWATT_HOUR = 0x00130708,
  THERM = 0x00000709
}

export enum PercentUnit {
  DEFAULT = -1,
  DECIMAL = 0x000004c0,
  PERCENT = 0x000004c1,
  DECIMAL_INVERT = 0x000004c2,
  PERCENT_INVERT = 0x000004c3
}

export enum AngleUnit {
  DEFAULT = -1,
  CARTESIAN_RADIAN = 0x000004b0,
  COMPASS_RADIAN = 0x010004b0,
  CARTESIAN_DEGREE = 0x020004b0,
  COMPASS_DEGREE = 0x030004b0,
  CARTESIAN_ARCSECOND = 0x040004b0,
  COMPASS_ARCSECOND = 0x050004b0
}

export enum CoordinateUnit {
  DEFAULT = -1,
  DEGREE = 0x00000800,
  DEGREE_MINUTE = 0x00000801,
  DEGREE_MINUTE_SECOND = 0x00000802,
  UTM = 0x00000803,
  RELATIVE_DISTANCE = 0x00000804
}

export class VelocityUnit {
  
  public distance = DistanceUnit.DEFAULT;
  
  public time = TimeUnit.DEFAULT;
}

export class IntensityUnit {
  
  public energy = EnergyUnit.DEFAULT;
  
  public distance = DistanceUnit.DEFAULT;
}

export class MassAreaUnit {
  
  public mass = MassUnit.DEFAULT;
  
  public area = AreaUnit.DEFAULT;
}

/**
 * Settings that define which units will be used when data is exported in summary
 * or statistics files. All units are optional with application defaults being
 * used for anything that isn't specified.
 */
export class UnitSettings {
  private static readonly PARAM_UNITS = "export_units";
  
  /**
   * Units for displaying small distance measurements.
   */
  public smallMeasureOutput = DistanceUnit.DEFAULT;
  /**
   * Units for displaying small distances.
   */
  public smallDistanceOutput = DistanceUnit.DEFAULT;
  /**
   * Units for displaying distances.
   */
  public distanceOutput = DistanceUnit.DEFAULT;
  /**
   * Alternate units for displaying distances.
   */
  public alternateDistanceOutput = DistanceUnit.DEFAULT;
  /**
   * Units for displaying coordinates.
   */
  public coordinateOutput = CoordinateUnit.DEFAULT;
  /**
   * Units for displaying areas.
   */
  public areaOutput = AreaUnit.DEFAULT;
  /**
   * Units for displaying volumes.
   */
  public volumeOutput = VolumeUnit.DEFAULT;
  /**
   * Units for displaying temperature.
   */
  public temperatureOutput = TemperatureUnit.DEFAULT;
  /**
   * Units for displaying mass or weight.
   */
  public massOutput = MassUnit.DEFAULT;
  /**
   * Units for displaying energy.
   */
  public energyOutput = EnergyUnit.DEFAULT;
  /**
   * Units for displaying angles.
   */
  public angleOutput = AngleUnit.DEFAULT;
  /**
   * Units for displaying velocity.
   */
  public velocityOutput = new VelocityUnit();
  /**
   * An alternate unit for displaying velocity.
   */
  public alternateVelocityOutput = new VelocityUnit();
  /**
   * Units for displaying fire intensity.
   */
  public intensityOutput = new IntensityUnit();
  /**
   * Units for displaying mass.
   */
  public massAreaOutput = new MassAreaUnit();
  
  /**
   * Find all errors that may exist in the unit settings.
   * @returns A list of all errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    return [];
  }
  
  /**
   * Streams the attachment to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    var tmp = `${this.smallMeasureOutput}|${this.smallDistanceOutput}|${this.distanceOutput}|${this.alternateDistanceOutput}`
    var tmp = `${tmp}|${this.coordinateOutput}|${this.areaOutput}|${this.volumeOutput}|${this.temperatureOutput}`
    var tmp = `${tmp}|${this.massOutput}|${this.energyOutput}|${this.angleOutput}|${this.velocityOutput.distance}`
    var tmp = `${tmp}|${this.velocityOutput.time}|${this.alternateVelocityOutput.distance}|${this.alternateVelocityOutput.time}|${this.intensityOutput.energy}`
    var tmp = `${tmp}|${this.intensityOutput.distance}|${this.massAreaOutput.mass}|${this.massAreaOutput.area}`
    
    builder.write(UnitSettings.PARAM_UNITS + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

/**
 * The types of load balancing available in W.I.S.E..
 */
export enum LoadBalanceType {
  /**
   * Don't use any load balancing. The generated FGM will be sent to
   * a single instance of W.I.S.E. Manager and it will run all scenarios.
   */
  NONE = 0,
  /**
   * Every instance of W.I.S.E. Manager in the same cluster will receive
   * the generated FGM. An external service will provide scenario
   * indices to run so that each instance of W.I.S.E. that is processing
   * the FGM will run different scenarios. The indices will be
   * communicated to the W.I.S.E. instance over MQTT. See the
   * [MQTT documentation](https://spydmobile.bitbucket.io/psaas_mqtt/#topic-psaas/{originator}/delegator/balance)
   * for more information.
   */
  EXTERNAL_COUNTER = 1,
  /**
   * The generated FGM will be sent to a single instance of W.I.S.E.
   * Manager. A file that the user creates will provide scenario
   * indices to the instance of W.I.S.E. that runs the FGM. The file
   * must be named balance.txt and each line must contian a valid
   * scenario index that should be run. Typically used for debugging
   * to force W.I.S.E. to only process a single scenario when many
   * are present in the FGM.
   */
  LOCAL_FILE = 2
}

/**
 * Options for running the job not related directly to
 * scenarios or fire growth.
 */
export class JobOptions extends IWISESerializable {
  private static readonly PARAM_OPTIONS = "fgm_settings";
  
  /**
   * The type of load balancing to use to run the job.
   */
  public loadBalance = LoadBalanceType.NONE;
  
  /**
   * A priority to use to sort the job queue. When a
   * job is recieved by an instance of W.I.S.E. Manager
   * it will be placed in the job queue immediately
   * below the first job found with the same or higher
   * priority that isn't already running starting from
   * the bottom of the queue.
   * 
   * The priority can be any valid integer value.
   */
  public priority = 0;
  
  /**
   * Should the job be validated by W.I.S.E. instead of
   * being run. The user can redo the job if there
   * is a validation error or restart the job so
   * that it simulates in W.I.S.E. using MQTT commands.
   */
  public validate = false;
  
  /**
   * Find all errors that may exist in the job settings.
   * @readonly A list of all errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    return [];
  }
  
  /**
   * Streams the options to a socket.
   * @param builder
   */
  public stream(builder: net.Socket): void {
    var tmp = `${this.loadBalance}|${this.priority}|${this.validate}`;
    
    builder.write(JobOptions.PARAM_OPTIONS + SocketMsg.NEWLINE);
    builder.write(tmp + SocketMsg.NEWLINE);
  }
}

/**
 * The top level class where all information required to run a W.I.S.E. job will be stored.
 * @author "Travis Redpath"
 */
export class WISE extends IWISESerializable {
  private static readonly PARAM_COMMENT = "GLOBALCOMMENTS";
  
  /**
   * Optional user comments about the job.
   */
  public comments: string = "";
  /**
   * Files that are needed as input for the job.
   */
  public inputs: WISEInputs;
  /**
   * Files that will be output from the job.
   */
  public outputs: WISEOutputs;
  /**
   * Settings that modify W.I.S.E.'s behaviour at the end of each timestep.
   */
  public timestepSettings: TimestepSettings;
  /**
   * Details of a service to stream output files to after all
   * simulations have completed.
   */
  public streamInfo: Array<OutputStreamInfo>;
  /**
   * Settings that define which units will be used when data is exported in summary
   * or statistics files.
   */
  public exportUnits: UnitSettings;
  /**
   * Options concering how to run the job, not related directly
   * to scenarios or fire growth.
   */
  public jobOptions: JobOptions;
  
  protected builder: net.Socket;
  
  /**
   * An array of files that can be used in place of
   * regular files in the simulation. Stores both
   * a filename and the file contents.
   */
  private attachments = new Array<FileAttachment>();
  
  /**
   * A counter to use when adding attachments to
   * make sure that the names are unique.
   */
  private attachmentIndex = 1;
  
  public constructor() {
    super();
    this.inputs = new WISEInputs();
    this.outputs = new WISEOutputs();
    this.timestepSettings = new TimestepSettings();
    this.streamInfo = new Array<OutputStreamInfo>();
    this.exportUnits = new UnitSettings();
    this.jobOptions = new JobOptions();
  }
  
  /**
   * Are the input and output values for the job valid.
   */
  public isValid(): boolean {
    return this.checkValid().length == 0;
  }
  
  /**
   * Get a list of errors that exist in the current W.I.S.E. configuration.
   * @returns A list of errors that were found.
   */
  public checkValid(): Array<ValidationError> {
    let errs = new Array<ValidationError>();
    let inputErrs = this.inputs.checkValid();
    if (inputErrs.length > 0) {
      let inErr = new ValidationError("inputs", "Errors in W.I.S.E. input values.", this);
      inputErrs.forEach(err => {
        inErr.addChild(err);
      });
      errs.push(inErr);
    }
    
    let outputErrs = this.outputs.checkValid();
    if (outputErrs.length > 0) {
      let outErr = new ValidationError("outputs", "Errors in W.I.S.E. output values.", this);
      outputErrs.forEach(err => {
        outErr.addChild(err);
      });
      errs.push(outErr);
    }
    
    let timestepErrs = this.timestepSettings.checkValid();
    if (timestepErrs.length > 0) {
      let timeErr = new ValidationError("timestepSettings", "Errors found in timestep settings.", this);
      timestepErrs.forEach(err => {
        timeErr.addChild(err);
      });
      errs.push(timeErr);
    }
    
    let streamErrs = new Array<ValidationError>();
    for (let i = 0; i < this.streamInfo.length; i++) {
      let stream = this.streamInfo[i].checkValid();
      if (stream.length > 0) {
        let temp = new ValidationError(i, `Errors found in stream info at ${i}.`, this.streamInfo);
        stream.forEach(err => {
          temp.addChild(err);
        });
        streamErrs.push(temp);
      }
    }
    if (streamErrs.length > 0) {
      let temp = new ValidationError("streamInfo", "Errors in stream settings.", this);
      streamErrs.forEach(err => {
        temp.addChild(err);
      });
      errs.push(temp);
    }
    
    let unitErrs = this.exportUnits.checkValid();
    if (unitErrs.length > 0) {
      let uErr = new ValidationError("exportUnits", "Errors found in unit settings.", this);
      unitErrs.forEach(err => {
        uErr.addChild(err);
      });
      errs.push(uErr);
    }
    
    let jobErrs = this.jobOptions.checkValid();
    if (jobErrs.length > 0) {
      let jErr = new ValidationError("jobOptions", "Errors found in job options.", this);
      jobErrs.forEach(err => {
        jErr.addChild(err);
      });
      errs.push(jErr);
    }
    return errs;
  }
  
  /**
   * Specify the timezone for all specified times.
   * @param zone The hour offset from UTC.
   * @param daylight Whether the offset is for daylight savings time or not.
   */
  public setTimezone(zone: Duration, daylight: boolean): void {
    this.inputs.timezone.offset = zone;
    this.inputs.timezone.dst = daylight;
  }
  
  /**
   * Clears the timezone for all specified times.
   */
  public clearTimezone(): void {
    this.inputs.timezone.offset = Duration.createTime(0, 0, 0, false);
    this.inputs.timezone.dst = false;
  }
  
  /**
   * Specify the timezone for all specified times by name. Must be one of the names
   * provided by the timezone classes <code>getTimezoneNameList()</code> function.
   * 
   * @param value The value associated with the time zone.
   */
  public setTimezoneByValue(value: number): void {
    this.inputs.timezone.value = Math.round(value);
  }
  
  /**
   * Unset the timezone for all specified times by name.
   */
  public unsetTimezoneByValue(value: number): void {
    this.inputs.timezone.value = 0;
  }
  
  /**
   * Set the projection file. This file is required.
   * An exception will be thrown if the file does not exist.
   * @param filename
   */
  public setProjectionFile(filename: string): void {
    this.inputs.files.projFile = filename;
  }
  
  /**
   * Unset the projection file.
   */
  public unsetProjectionFile(): void {
    this.inputs.files.projFile = "";
  }
  
  /**
   * Set the look up table. Replaces any existing LUT. One of this and {@link setLutDefinition} must be used but they
   * cannot be used together.
   * An exception will be thrown if the file does not exist.
   * @param filename
   */
  public setLutFile(filename: string): void {
    this.inputs.files.lutFile = filename;
  }
  
  /**
   * Set the LUT using an array of fuel definitions. Replaces any existing LUT. One of this and {@link setLutFile} must be used but they
   * cannot be used together.
   * @param fuels A list of fuel definitions to use as the LUT table.
   * @param filename An optional filename that will be used as a placeholder in the FGM for the LUT.
   * @returns False if the fuel definitions were not able to be added, the attachment name if setting the LUT was successful.
   */
  public setLutDefinition(fuels: Array<FuelDefinition>, filename = "api_fuel_def.csv"): string | boolean {
    let s = "API_FUEL_DEF";
    for (const fuel of fuels) {
      s += "|API_FUEL|";
      s += fuel.toString();
    }
    const att = this.addAttachment(filename, s);
    if (!att) {
      throw new Error("Invalid LUT definition. Unable to attach to job.");
    }
    this.setLutFile('' + att);
    return att;
  }
  
  /**
   * Unset the look up table.
   */
  public unsetLutFile(): void {
    this.inputs.files.lutFile = "";
  }
  
  /**
   * Set the percent conifer for the M-1, M-2, NZ-54, or NZ-69 fuel type.
   * @param fuel The fuel type to set the percent conifer for. Must be M-1, M-2, NZ-54, or NZ-69.
   * @param value The percent conifer as a percent (0 - 100%).
   */
  public setPercentConifer(fuel: "M-1"|"M-2"|"NZ-54"|"NZ-69", value: number): void {
    let option = new FuelOption();
    option.fuelType = fuel;
    option.optionType = FuelOptionType.PERCENT_CONIFER;
    option.value = value;
    this.inputs.fuelOptions.push(option);
  }
  
  /**
   * Set the percent dead fir for either the M-3 or M-4 fuel type.
   * @param fuel The fuel type to set the percent dead fir for. Must be either M-3 or M-4.
   * @param value The percent dead fir as a percent (0 - 100%).
   */
  public setPercentDeadFir(fuel: "M-3"|"M-4", value: number): void {
    let option = new FuelOption();
    option.fuelType = fuel;
    option.optionType = FuelOptionType.PERCENT_DEAD_FIR;
    option.value = value;
    this.inputs.fuelOptions.push(option);
  }
  
  /**
   * Set the grass curing for the O-1a, O-1b, NZ-2, NZ-15, NZ-30, NZ-31, NZ-32, NZ-33, NZ-40,
   * NZ-41, NZ-43, NZ-46, NZ-50, NZ-53, NZ-62, NZ-63, or NZ-65 fuel type. If unset, this also
   * sets the grass fuel load to 0.35kg/m^2.
   * @param fuel The fuel type to set the grass curing for.
   * @param value The grass curing (0 - 100%).
   */
  public setGrassCuring(fuel: "O-1a"|"O-1b"|"NZ-2"|"NZ-15"|"NZ-30"|"NZ-31"|"NZ-32"|"NZ-33"|"NZ-40"|"NZ-41"|"NZ-43"|"NZ-46"|"NZ-50"|"NZ-53"|"NZ-62"|"NZ-63"|"NZ-65", value: number): void {
    let option = new FuelOption();
    option.fuelType = fuel;
    option.optionType = FuelOptionType.GRASS_CURING;
    option.value = value / 100.0;
    this.inputs.fuelOptions.push(option);
  }
  
  /**
   * Set the grass fuel load for either the O-1a, O-1b, NZ-2, NZ-15, NZ-30, NZ-31, NZ-32, NZ-33, NZ-40,
   * NZ-41, NZ-43, NZ-46, NZ-50, NZ-53, NZ-62, NZ-63, or NZ-65 fuel type. If unset, this also
   * sets the grass curing to 60%.
   * @param fuel The fuel type to set the grass fuel load for.
   * @param value The grass fuel load (kg/m^2).
   */
  public setGrassFuelLoad(fuel: "O-1a"|"O-1b"|"NZ-2"|"NZ-15"|"NZ-30"|"NZ-31"|"NZ-32"|"NZ-33"|"NZ-40"|"NZ-41"|"NZ-43"|"NZ-46"|"NZ-50"|"NZ-53"|"NZ-62"|"NZ-63"|"NZ-65", value: number): void {
    let option = new FuelOption();
    option.fuelType = fuel;
    option.optionType = FuelOptionType.GRASS_FUEL_LOAD;
    option.value = value;
    this.inputs.fuelOptions.push(option);
  }
  
  /**
   * Set the crown base height.
   * @param fuel The fuel type to set the crown base height for. Must be C-1, C-6, NZ-60, NZ-61, NZ-66, NZ-67, or NZ-71.
   * @param value The crown base height (m).
   */
  public setCrownBaseHeight(fuel: "C-1"|"C-6"|"NZ-60"|"NZ-61"|"NZ-66"|"NZ-67"|"NZ-71", value: number): void {
    let option = new FuelOption();
    option.fuelType = fuel;
    option.optionType = FuelOptionType.CROWN_BASE_HEIGHT;
    option.value = value;
    this.inputs.fuelOptions.push(option);
  }
  
  /**
   * Set the crown fuel load in kg/m^2.
   * @param fuel The fuel type to set the crown fuel load for. Must be C-1, C-6, NZ-60, NZ-61, NZ-66, NZ-67, or NZ-71.
   * @param value The crown fuel load (kg/m^2).
   */
  public setCrownFuelLoad(fuel: "C-1"|"C-6"|"NZ-60"|"NZ-61"|"NZ-66"|"NZ-67"|"NZ-71", value: number): void {
    let option = new FuelOption();
    option.fuelType = fuel;
    option.optionType = FuelOptionType.CROWN_FUEL_LOAD;
    option.value = value;
    this.inputs.fuelOptions.push(option);
  }
  
  /**
   * Remove a FuelOption object from the input fuel options.
   * @param fuelOption The FuelOption object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeFuelOption(fuelOption: FuelOption): boolean {
    var index = this.inputs.fuelOptions.indexOf(fuelOption);
    if (index != -1) {
      this.inputs.fuelOptions.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Set the fuel map file. This file is required.
   * An exception will be thrown if the file does not exist.
   * @param filename Can either be the actual file path or the 
   * 			   attachment URL returned from {@link addAttachment}
   */
  public setFuelmapFile(filename: string): void {
    this.inputs.files.fuelmapFile = filename;
  }
  
  /**
   * Unset the fuel map file.
   */
  public unsetFuelmapFile(): void {
    this.inputs.files.fuelmapFile = "";
  }
  
  /**
   * Set the default FMC value for the fuel map.
   * This value can be overridden by scenarios.
   * @param value The default FMC value. Set to -1 to disable.
   * @deprecated deprecated since 6.2.4.3. Project level default FMC is no longer used.
   */
  public setDefaultFMC(value: number): void {
  }
  
  /**
   * Set the elevation grid file. An elevation grid file is optional.
   * An exception will be thrown if the file does not exist.
   * @param filename Can either be the actual file path or the attachment 
   * 			   URL returned from {@link addAttachment}
   */
  public setElevationFile(filename: string): void {
    this.inputs.files.elevFile = filename;
  }
  
  /**
   * Unset the elevation grid file
   */
  public unsetElevationFile(): void {
    this.inputs.files.elevFile = "";
  }
  
  /**
   * Add a grid file to the project.
   * @param filename The location of the grid file. Can either 
   * 			   be the actual file path or the attachment 
   * 			   URL returned from {@link addAttachment}
   * @param proj The location of the grid files projection.
   * @param type Must be one of the GridFile::TYPE_* values.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set and {@link SocketMsg.skipFileTests} is not set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if the file doesn't exist.
   */
  public addGridFile(filename: string, proj: string, type: GridFileType): GridFile {
    let gf = new GridFile();
    gf.filename = filename;
    gf.projection = proj;
    gf.type = type;
    this.inputs.files.gridFiles.push(gf);
    return gf;
  }
  
  /**
   * Add a grid file to the project.
   * @param filename The location of the grid file. Can either 
   * 			   be the actual file path or the attachment 
   * 			   URL returned from {@link addAttachment}
   * @param proj The location of the grid files projection.
   * @param type Must be one of the GridFile::TYPE_* values.
   * @param comment A user comment to add to the grid file.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set and {@link SocketMsg.skipFileTests} is not set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if the file doesn't exist.
   */
  public addGridFileWithComment(filename: string, proj: string, type: GridFileType, comment: string): GridFile {
    let gf = new GridFile();
    gf.filename = filename;
    gf.projection = proj;
    gf.type = type;
    gf.comment = comment;
    this.inputs.files.gridFiles.push(gf);
    return gf;
  }
  
  /**
   * Remove a GridFile object from the grid files.
   * @param gridFile The GridFile object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeGridFile(gridFile: GridFile): boolean {
    var index = this.inputs.files.gridFiles.indexOf(gridFile);
    if (index != -1) {
      this.inputs.files.gridFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add a landscape fuel patch to the job.
   * @param fromFuel The fuel to change from. Can either be one of the {@link FromFuel} wildcard rules or the name of a fuel.
   * @param toFuel The name of the fuel to change to.
   * @param comment An optional user created comment to attach to the fuel patch.
   */
  public addLandscapeFuelPatch(fromFuel: FromFuel | string, toFuel: string, comment?: string): FuelPatch {
    let fp = new FuelPatch();
    fp.type = FuelPatchType.LANDSCAPE;
    if (fromFuel === FromFuel.ALL || fromFuel === FromFuel.ALL_COMBUSTABLE || fromFuel === FromFuel.NODATA) {
      fp.fromFuelRule = fromFuel;
    }
    else {
      fp.fromFuel = fromFuel;
    }
    fp.toFuel = toFuel;
    if (comment != null) {
      fp.comments = comment;
    }
    this.inputs.files.fuelPatchFiles.push(fp);
    return fp;
  }
  
  /**
   * Add a file fuel patch to the job.
   * @param filename The location of the shape file. Can either be the actual file path or the attachment URL returned from {@link addAttachment}
   * @param fromFuel The fuel to change from. Can either be one of the rules defined in FuelPatch (FROM_FUEL_*) or the name of a fuel.
   * @param toFuel The name of the fuel to change to.
   * @param comment An optional user created comment to attach to the fuel patch.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set and {@link SocketMsg.skipFileTests} is not set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if the file doesn't exist.
   */
  public addFileFuelPatch(filename: string, fromFuel: FromFuel | string, toFuel: string, comment?: string): FuelPatch {
    let fp = new FuelPatch();
    fp.type = FuelPatchType.FILE;
    fp.filename = filename;
    if (fromFuel === FromFuel.ALL || fromFuel === FromFuel.ALL_COMBUSTABLE || fromFuel === FromFuel.NODATA) {
      fp.fromFuelRule = fromFuel;
    }
    else {
      fp.fromFuel = fromFuel;
    }
    fp.toFuel = toFuel;
    if (comment != null) {
      fp.comments = comment;
    }
    this.inputs.files.fuelPatchFiles.push(fp);
    return fp;
  }
  
  /**
   * Add a polygon fuel patch to the job.
   * @param vertices The vertices of the polygon. Must be an array of LatLon values. The LatLon values will be copied by reference.
   * @param fromFuel The fuel to change from. Can either be one of the rules defined in FuelPatch (FROM_FUEL_*) or the name of a fuel.
   * @param toFuel The name of the fuel to change to.
   * @param comments An optional user created comment to attach to the fuel patch.
   */
  public addPolygonFuelPatch(vertices: Array<LatLon>, fromFuel: FromFuel | string, toFuel: string, comments?: string): FuelPatch {
    let fp = new FuelPatch();
    fp.type = FuelPatchType.POLYGON;
    fp.feature = vertices;
    if (fromFuel === FromFuel.ALL || fromFuel === FromFuel.ALL_COMBUSTABLE || fromFuel === FromFuel.NODATA) {
      fp.fromFuelRule = fromFuel;
    }
    else {
      fp.fromFuel = fromFuel;
    }
    fp.toFuel = toFuel;
    if (comments != null) {
      fp.comments = comments;
    }
    this.inputs.files.fuelPatchFiles.push(fp);
    return fp;
  }
  
  /**
   * Remove a FuelPatch object from the fuel patch files.
   * @param fuelPatch The FuelPatch object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeFuelPatch(fuelPatch: FuelPatch): boolean {
    var index = this.inputs.files.fuelPatchFiles.indexOf(fuelPatch);
    if (index != -1) {
      this.inputs.files.fuelPatchFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add a fuel break to the project.
   * @param filename The file location of the fuel break. Can either be the actual file 
   * 			   path or the attachment URL returned from {@link addAttachment}
   * @param comments An optional user created comment to attach to the fuel break.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set and {@link SocketMsg.skipFileTests} is not set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if the file doesn't exist.
   */
  public addFileFuelBreak(filename: string, comments?: string): FuelBreak {
    let fb = new FuelBreak();
    if (comments != null) {
      fb.comments = comments;
    }
    fb.type = FuelBreakType.FILE;
    fb.filename = filename;
    this.inputs.files.fuelBreakFiles.push(fb);
    return fb;
  }
  
  /**
   * Add a fuel break to the project.
   * @param vertices The vertices of the polygon. Must be an array of LatLon values. The LatLon values will be copied by reference.
   * @param comments An optional user created comment to attach to the fuel break;
   */
  public addPolygonFuelBreak(vertices: Array<LatLon>, comments?: string): FuelBreak {
    let fb = new FuelBreak();
    if (comments != null) {
      fb.comments = comments;
    }
    fb.type = FuelBreakType.POLYGON;
    fb.feature = vertices;
    this.inputs.files.fuelBreakFiles.push(fb);
    return fb;
  }
  
  /**
   * Add a fuel break to the project.
   * @param vertices The vertices of the polyline. Must be an array of LatLon values. The LatLon values will be copied by reference.
   * @param width The width of the fuel break.
   * @param comments An optional user created comment to attach to the fuel break;
   */
  public addPolylineFuelBreak(vertices: Array<LatLon>, width: number, comments?: string): FuelBreak {
    let fb = new FuelBreak();
    if (comments != null) {
      fb.comments = comments;
    }
    fb.type = FuelBreakType.POLYLINE;
    fb.width = width;
    fb.feature = vertices;
    this.inputs.files.fuelBreakFiles.push(fb);
    return fb;
  }
  
  /**
   * Remove a FuelBreak object from the fuel break files.
   * @param fuelBreak The FuelBreak object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeFuelBreak(fuelBreak: FuelBreak): boolean {
    var index = this.inputs.files.fuelBreakFiles.indexOf(fuelBreak);
    if (index != -1) {
      this.inputs.files.fuelBreakFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add a weather station to the project.
   * @param elevation The elevation of the weather station.
   * @param location The location of the weather station.
   * @param comments An optional user created comment to attach to the weather station.
   * @return WeatherStation
   */
  public addWeatherStation(elevation: number, location: LatLon, comments?: string): WeatherStation {
    let ws = new WeatherStation();
    if (comments != null) {
      ws.comments = comments;
    }
    ws.elevation = elevation;
    ws.location = location;
    this.inputs.weatherStations.push(ws);
    return ws;
  }
  
  /**
   * Remove a WeatherStation object from the weather stations.
   * @param weatherStation The WeatherStation object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeWeatherStation(weatherStation: WeatherStation): boolean {
    var index = this.inputs.weatherStations.indexOf(weatherStation);
    if (index != -1) {
      this.inputs.weatherStations.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add a weather patch from a file.
   * @param filename The location of the file containing the patches location. Can 
   * 				   either be the actual file path or the attachment URL returned 
   *                 from {@link addAttachment}
   * @param startTime The patch start time. If a string is used must be formatted as "YYYY-MM-DDThh:mm:ss".
   * @param startTimeOfDay The patches start time of day. If a string is used it must be formatted as "hh:mm:ss".
   * @param endTime The patch end time. If a string is used must be formatted as "YYYY-MM-DDThh:mm:ss".
   * @param endTimeOfDay The patches end time of day. If a string is used it must be formatted as "hh:mm:ss".
   * @param comments An optional user created comment to attach to the weather patch.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set and {@link SocketMsg.skipFileTests} is not set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if the file doesn't exist.
   * @return WeatherPatch
   */
  public addFileWeatherPatch(filename: string, startTime: string|DateTime, startTimeOfDay: string|Duration, endTime: string|DateTime, endTimeOfDay: string|Duration, comments?: string): WeatherPatch {
    let wp = new WeatherPatch();
    if (comments != null) {
      wp.comments = comments;
    }
    if (typeof endTime === "string") {
      wp.endTime = endTime;
    }
    else {
      wp.lEndTime = endTime;
    }
    if (typeof endTimeOfDay === "string") {
      wp.endTimeOfDay = endTimeOfDay;
    }
    else {
      wp.dEndTimeOfDay = endTimeOfDay;
    }
    wp.type = WeatherPatchType.FILE;
    wp.filename = filename;
    if (typeof startTime === "string") {
      wp.startTime = startTime;
    }
    else {
      wp.lStartTime = startTime;
    }
    if (typeof startTimeOfDay === "string") {
      wp.startTimeOfDay = startTimeOfDay;
    }
    else {
      wp.dStartTimeOfDay = startTimeOfDay;
    }
    this.inputs.files.weatherPatchFiles.push(wp);
    return wp;
  }
  
  /**
   * Add a weather patch from an array of vertices of a polygon.
   * @param vertices The vertices of the polygon.
   * @param startTime The patch start time. If a string is used it must be formatted as "YYYY-MM-DDThh:mm:ss".
   * @param startTimeOfDay The patches start time of day. If a string is used it must be formatted as "hh:mm:ss".
   * @param endTime The patch end time. If a string is used it must be formatted as "YYYY-MM-DDThh:mm:ss".
   * @param endTimeOfDay The patches end time of day. If a string is used it must be formatted as "hh:mm:ss".
   * @param comments An optional user created comment to attach to the weather patch.
   * @return WeatherPatch
   */
  public addPolygonWeatherPatch(vertices: Array<LatLon>, startTime: string|DateTime, startTimeOfDay: string|Duration, endTime: string|DateTime, endTimeOfDay: string|Duration, comments?: string): WeatherPatch {
    let wp = new WeatherPatch();
    if (comments != null) {
      wp.comments = comments;
    }
    if (typeof endTime === "string") {
      wp.endTime = endTime;
    }
    else {
      wp.lEndTime = endTime;
    }
    if (typeof endTimeOfDay === "string") {
      wp.endTimeOfDay = endTimeOfDay;
    }
    else {
      wp.dEndTimeOfDay = endTimeOfDay;
    }
    wp.type = WeatherPatchType.POLYGON;
    wp.feature = vertices;
    if (typeof startTime === "string") {
      wp.startTime = startTime;
    }
    else {
      wp.lStartTime = startTime;
    }
    if (typeof startTimeOfDay === "string") {
      wp.startTimeOfDay = startTimeOfDay;
    }
    else {
      wp.dStartTimeOfDay = startTimeOfDay;
    }
    this.inputs.files.weatherPatchFiles.push(wp);
    return wp;
  }
  
  /**
   * Add a landscape weather patch.
   * @param startTime The patch start time. If a string is used it must be formatted as "YYYY-MM-DDThh:mm:ss".
   * @param startTimeOfDay The patches start time of day. If a string is used it must be formatted as "hh:mm:ss".
   * @param endTime The patch end time. If a string is used it must be formatted as "YYYY-MM-DDThh:mm:ss".
   * @param endTimeOfDay The patches end time of day. If a string is used it must be formatted as "hh:mm:ss".
   * @param comments An optional user created comment to attach to the weather patch.
   * @return WeatherPatch
   */
  public addLandscapeWeatherPatch(startTime: string|DateTime, startTimeOfDay: string|Duration, endTime: string|DateTime, endTimeOfDay: string|Duration, comments?: string): WeatherPatch {
    let wp = new WeatherPatch();
    if (comments != null) {
      wp.comments = comments;
    }
    if (typeof endTime === "string") {
      wp.endTime = endTime;
    }
    else {
      wp.lEndTime = endTime;
    }
    if (typeof endTimeOfDay === "string") {
      wp.endTimeOfDay = endTimeOfDay;
    }
    else {
      wp.dEndTimeOfDay = endTimeOfDay;
    }
    wp.type = WeatherPatchType.LANDSCAPE;
    if (typeof startTime === "string") {
      wp.startTime = startTime;
    }
    else {
      wp.lStartTime = startTime;
    }
    if (typeof startTimeOfDay === "string") {
      wp.startTimeOfDay = startTimeOfDay;
    }
    else {
      wp.dStartTimeOfDay = startTimeOfDay;
    }
    this.inputs.files.weatherPatchFiles.push(wp);
    return wp;
  }
  
  /**
   * Remove a WeatherPatch object from the weather patch files.
   * @param weatherPatch The WeatherPatch object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeWeatherPatch(weatherPatch: WeatherPatch): boolean {
    var index = this.inputs.files.weatherPatchFiles.indexOf(weatherPatch);
    if (index != -1) {
      this.inputs.files.weatherPatchFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add a weather grid for wind directions to the project.
   * @param startTime The grids start time. If a string is used it must be formatted as "YYYY-MM-DDThh:mm:ss".
   * @param startTimeOfDay The grids start time of day. If a string is used it must be formatted as "hh:mm:ss".
   * @param endTime The grids end time. If a string is used it must be formatted as "YYYY-MM-DDThh:mm:ss".
   * @param endTimeOfDay The grids end time of day. If a string is used it must be formatted as "hh:mm:ss".
   * @param comments An optional user created comment to attach to the weather grid.
   * @return WeatherGrid
   */
  public addDirectionWeatherGrid(startTime: string|DateTime, startTimeOfDay: string|Duration, endTime: string|DateTime, endTimeOfDay: string|Duration, comments?: string): WeatherGrid {
    let wg = new WeatherGrid();
    if (comments != null) {
      wg.comments = comments;
    }
    if (typeof endTime === "string") {
      wg.endTime = endTime;
    }
    else {
      wg.lEndTime = endTime;
    }
    if (typeof endTimeOfDay === "string") {
      wg.endTimeOfDay = endTimeOfDay;
    }
    else {
      wg.dEndTimeOfDay = endTimeOfDay;
    }
    if (typeof startTime === "string") {
      wg.startTime = startTime;
    }
    else {
      wg.lStartTime = startTime;
    }
    if (typeof startTimeOfDay === "string") {
      wg.startTimeOfDay = startTimeOfDay;
    }
    else {
      wg.dStartTimeOfDay = startTimeOfDay;
    }
    wg.type = WeatherGridType.DIRECTION;
    this.inputs.files.weatherGridFiles.push(wg);
    return wg;
  }
  
  /**
   * Add a weather grid for wind speeds to the project.
   * @param startTime The grids start time. If a string is used it must be formatted as "YYYY-MM-DDThh:mm:ss".
   * @param startTimeOfDay The grids start time of day. Must be formatted as "hh:mm:ss".
   * @param endTime The grids end time. If a string is used it must be formatted as "YYYY-MM-DDThh:mm:ss".
   * @param endTimeOfDay The grids end time of day. Must be formatted as "hh:mm:ss".
   * @param comments An optional user created comment to attach to the weather grid.
   * @return WeatherGrid
   */
  public addSpeedWeatherGrid(startTime: string|DateTime, startTimeOfDay: string|Duration, endTime: string|DateTime, endTimeOfDay: string|Duration, comments?: string): WeatherGrid {
    let wg = new WeatherGrid();
    if (comments != null) {
      wg.comments = comments;
    }
    if (typeof endTime === "string") {
      wg.endTime = endTime;
    }
    else {
      wg.lEndTime = endTime;
    }
    if (typeof endTimeOfDay === "string") {
      wg.endTimeOfDay = endTimeOfDay;
    }
    else {
      wg.dEndTimeOfDay = endTimeOfDay;
    }
    if (typeof startTime === "string") {
      wg.startTime = startTime;
    }
    else {
      wg.lStartTime = startTime;
    }
    if (typeof startTimeOfDay === "string") {
      wg.startTimeOfDay = startTimeOfDay;
    }
    else {
      wg.dStartTimeOfDay = startTimeOfDay;
    }
    wg.type = WeatherGridType.SPEED;
    this.inputs.files.weatherGridFiles.push(wg);
    return wg;
  }
  
  /**
   * Remove a WeatherGrid object from the weather grid files.
   * @param weatherGrid The WeatherGrid object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeWeatherGrid(weatherGrid: WeatherGrid): boolean {
    var index = this.inputs.files.weatherGridFiles.indexOf(weatherGrid);
    if (index != -1) {
      this.inputs.files.weatherGridFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add an ignition from a file.
   * @param filename The location of the ignitions file. Can either be the actual file path 
   * 				   or the attachment URL returned from {@link addAttachment}
   * @param startTime The ignitions start time.
   * @param comments An optional user created comment to attach to the ignition.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set and {@link SocketMsg.skipFileTests} is not set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if the file doesn't exist.
   * @return Ignition
   */
  public addFileIgnition(filename: string, startTime: string|DateTime, comments?: string): Ignition {
    let ig = new Ignition();
    if (typeof startTime === "string") {
      ig.startTime = startTime;
    }
    else {
      ig.lStartTime = startTime;
    }
    if (comments != null) {
      ig.comments = comments;
    }
    ig.type = IgnitionType.FILE;
    ig.filename = filename;
    this.inputs.ignitions.push(ig);
    return ig;
  }
  
  /**
   * Add an ignition from a single point. If this is to be a multipoint more points can be added
   * to the returned object using {@link Ignition#addPoint}.
   * @param startTime The ignitions start time.
   * @param point The location of the ignition.
   * @param comments An optional user created comment to attach to the ignition.
   * @return Ignition
   */
  public addPointIgnition(point: LatLon, startTime: string|DateTime, comments?: string): Ignition {
    let ig = new Ignition();
    if (typeof startTime === "string") {
      ig.startTime = startTime;
    }
    else {
      ig.lStartTime = startTime;
    }
    if (comments != null) {
      ig.comments = comments;
    }
    ig.type = IgnitionType.POINT;
    ig.feature.push(point);
    this.inputs.ignitions.push(ig);
    return ig;
  }
  
  /**
   * Add an ignition with multiple points.
   * @param points An array of LatLons that are all point ignitions.
   * @param startTime The ignitions start time.
   * @param comments An optional user created comment to attach to the ignition.
   * @return Ignition
   */
  public addMultiPointIgnition(points: Array<LatLon>, startTime: string|DateTime, comments?: string): Ignition {
    let ig = new Ignition();
    if (typeof startTime === "string") {
      ig.startTime = startTime;
    }
    else {
      ig.lStartTime = startTime;
    }
    if (comments != null) {
      ig.comments = comments;
    }
    ig.type = IgnitionType.POINT;
    ig.feature = points;
    this.inputs.ignitions.push(ig);
    return ig;
  }
  
  /**
   * Add an ignition from a set of vertices.
   * @param startTime The ignitions start time.
   * @param vertices An array of LatLons that describe the polygon.
   * @param comments An optional user created comment to attach to the ignition.
   * @return Ignition
   */
  public addPolygonIgnition(vertices: Array<LatLon>, startTime: string|DateTime, comments?: string): Ignition {
    let ig = new Ignition();
    if (typeof startTime === "string") {
      ig.startTime = startTime;
    }
    else {
      ig.lStartTime = startTime;
    }
    if (comments != null) {
      ig.comments = comments;
    }
    ig.type = IgnitionType.POLYGON;
    ig.feature = vertices;
    this.inputs.ignitions.push(ig);
    return ig;
  }
  
  /**
   * Add an ignition from a set of vertices.
   * @param vertices An array of LatLons that descrive the polyline.
   * @param startTime The ignitions start time.
   * @param comments An optional user created comment to attach to the ignition.
   * @return Ignition
   */
  public addPolylineIgnition(vertices: Array<LatLon>, startTime: string|DateTime, comments?: string): Ignition {
    let ig = new Ignition();
    if (typeof startTime === "string") {
      ig.startTime = startTime;
    }
    else {
      ig.lStartTime = startTime;
    }
    if (comments != null) {
      ig.comments = comments;
    }
    ig.type = IgnitionType.POLYLINE;
    ig.feature = vertices;
    this.inputs.ignitions.push(ig);
    return ig;
  }
  
  /**
   * Remove an Ignition object from the ignitions.
   * @param ignition The Ignition object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeIgnition(ignition: Ignition): boolean {
    var index = this.inputs.ignitions.indexOf(ignition);
    if (index != -1) {
      this.inputs.ignitions.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add a new asset using a shapefile.
   * @param filename The location of the shapefile to use as the shape of the asset.
   * @param comments Any user defined comments for the asset. Can be null if there are no comments.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set and {@link SocketMsg.skipFileTests} is not set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if the file doesn't exist.
   */
  public addFileAsset(filename: string, comments?: string): AssetFile {
    var asset = new AssetFile();
    if (comments != null) {
      asset.comments = comments;
    }
    asset.type = AssetShapeType.FILE;
    asset.filename = filename;
    this.inputs.assetFiles.push(asset);
    return asset;
  }
  
  /**
   * Add a new asset using a single point. A buffer around the point can be created
   * using the {@code buffer} property.
   * @param location The lat/lon of the asset.
   * @param comments Any user defined comments for the asset. Can be null if there are no comments.
   */
  public addPointAsset(location: LatLon, comments?: string): AssetFile {
    var asset = new AssetFile();
    if (comments != null) {
      asset.comments = comments;
    }
    asset.type = AssetShapeType.POINT;
    asset.feature.push(location);
    this.inputs.assetFiles.push(asset);
    return asset;
  }
  
  /**
   * Add a new asset using a polygon.
   * @param locations An array of lat/lons that make up the polygon.
   * @param comments Any user defined comments for the asset. Can be null if there are no comments.
   */
  public addPolygonAsset(locations: Array<LatLon>, comments?: string): AssetFile {
    var asset = new AssetFile();
    if (comments != null) {
      asset.comments = comments;
    }
    asset.type = AssetShapeType.POLYGON;
    asset.feature = locations;
    this.inputs.assetFiles.push(asset);
    return asset;
  }
  
  /**
   * Add a new asset using a polyline. A buffer around the line can be created
   * using the {@code buffer} property.
   * @param locations An array of lat/lons that make up the polyline.
   * @param comments Any user defined comments for the asset. Can be null if there are no comments.
   */
  public addPolylineAsset(locations: Array<LatLon>, comments?: string): AssetFile {
    var asset = new AssetFile();
    if (comments != null) {
      asset.comments = comments;
    }
    asset.type = AssetShapeType.POLYLINE;
    asset.feature = locations;
    this.inputs.assetFiles.push(asset);
    return asset;
  }
  
  /**
   * Remove an asset from the job. This will not remove it from any
   * scenarios that it may be associated with.
   * @param asset The asset to remove.
   */
  public removeAsset(asset: AssetFile): boolean {
    var index = this.inputs.assetFiles.indexOf(asset);
    if (index != -1) {
      this.inputs.assetFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add a new target using a shapefile.
   * @param filename The location of the shapefile to use as the shape of the target.
   * @param comments Any user defined comments for the target. Can be null if there are no comments.
   * @throws If {@link SocketMsg.inlineThrowOnError} is set and {@link SocketMsg.skipFileTests} is not set a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError RangeError} will be thrown if the file doesn't exist.
   */
  public addFileTarget(filename: string, comments?: string): TargetFile {
    var target = new TargetFile();
    if (comments != null) {
      target.comments = comments;
    }
    target.type = AssetShapeType.FILE;
    target.filename = filename;
    this.inputs.targetFiles.push(target);
    return target;
  }
  
  /**
   * Add a new target using a single point.
   * @param location The lat/lon of the target.
   * @param comments Any user defined comments for the target. Can be null if there are no comments.
   */
  public addPointTarget(location: LatLon, comments?: string): TargetFile {
    var target = new TargetFile();
    if (comments != null) {
      target.comments = comments;
    }
    target.type = AssetShapeType.POINT;
    target.feature.push(location);
    this.inputs.targetFiles.push(target);
    return target;
  }
  
  /**
   * Add a new target using a polygon.
   * @param locations An array of lat/lons that make up the polygon.
   * @param comments Any user defined comments for the target. Can be null if there are no comments.
   */
  public addPolygonTarget(locations: Array<LatLon>, comments?: string): TargetFile {
    var target = new TargetFile();
    if (comments != null) {
      target.comments = comments;
    }
    target.type = AssetShapeType.POLYGON;
    target.feature = locations;
    this.inputs.targetFiles.push(target);
    return target;
  }
  
  /**
   * Add a new target using a polyline.
   * @param locations An array of lat/lons that make up the polyline.
   * @param comments Any user defined comments for the asset. Can be null if there are no comments.
   */
  public addPolylineTarget(locations: Array<LatLon>, comments?: string): TargetFile {
    var target = new TargetFile();
    if (comments != null) {
      target.comments = comments;
    }
    target.type = AssetShapeType.POLYLINE;
    target.feature = locations;
    this.inputs.targetFiles.push(target);
    return target;
  }
  
  /**
   * Remove an target from the job. This will not remove it from any
   * scenarios that it may be associated with.
   * @param target The target to remove.
   */
  public removeTarget(target: TargetFile): boolean {
    var index = this.inputs.targetFiles.indexOf(target);
    if (index != -1) {
      this.inputs.targetFiles.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Add a scenario to the job.
   * @param startTime The start time of the scenario. If a string is used it must be formatted as 'YYYY-MM-DDThh:mm:ss'.
   * @param endTime The end time of the scenario. If a string is used it must be formatted as 'YYYY-MM-DDThh:mm:ss'.
   * @param comments An optional user created comment to attach to the scenario.
   */
  public addScenario(startTime: string|DateTime, endTime: string|DateTime, comments?: string): Scenario {
    let scen = new Scenario();
    if (typeof startTime === "string") {
      scen.startTime = startTime;
    }
    else {
      scen.lStartTime = startTime;
    }
    if (typeof endTime === "string") {
      scen.endTime = endTime;
    }
    else {
      scen.lEndTime = endTime;
    }
    if (comments != null) {
      scen.comments = comments;
    }
    this.inputs.scenarios.push(scen);
    return scen;
  }
  
  /**
   * Remove a Scenario object from the scenarios.
   * @param scenario The Scenario object to remove
   * @returns A boolean indicating if the object was found and removed
   */
  public removeScenario(scenario: Scenario): boolean {
    var index = this.inputs.scenarios.indexOf(scenario);
    if (index != -1) {
      this.inputs.scenarios.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   *  Add a grid file output to a scenario.
   * @param stat The statistic to output.
   * @param filename The name of the output file. Can either 
   * 				   be the actual file path or the attachment 
   *  			   URL returned from {@link addAttachment}
   * @param time The simulation time to output the file at.
   * @param interpMethod The interpolation method to use.
   * @param scen The scenario to output the data for.
   * @return Output_GridFile
   */
  public addOutputGridFileToScenario(stat: GlobalStatistics.TEMPERATURE | GlobalStatistics.DEW_POINT | GlobalStatistics.RELATIVE_HUMIDITY |
                                           GlobalStatistics.WIND_DIRECTION | GlobalStatistics.WIND_SPEED | GlobalStatistics.PRECIPITATION |
                                           GlobalStatistics.FFMC | GlobalStatistics.ISI | GlobalStatistics.FWI |
                                           GlobalStatistics.BUI | GlobalStatistics.MAX_FI | GlobalStatistics.MAX_FL |
                                           GlobalStatistics.MAX_ROS | GlobalStatistics.MAX_SFC | GlobalStatistics.MAX_CFC |
                                           GlobalStatistics.MAX_TFC | GlobalStatistics.MAX_CFB | GlobalStatistics.RAZ |
                                           GlobalStatistics.BURN_GRID | GlobalStatistics.FIRE_ARRIVAL_TIME | GlobalStatistics.HROS |
                                           GlobalStatistics.FROS | GlobalStatistics.BROS | GlobalStatistics.RSS |
                                           GlobalStatistics.ACTIVE_PERIMETER | GlobalStatistics.BURN | GlobalStatistics.BURN_PERCENTAGE |
                                           GlobalStatistics.FIRE_ARRIVAL_TIME_MIN | GlobalStatistics.FIRE_ARRIVAL_TIME_MAX | GlobalStatistics.TOTAL_FUEL_CONSUMED |
                                           GlobalStatistics.SURFACE_FUEL_CONSUMED | GlobalStatistics.CROWN_FUEL_CONSUMED | GlobalStatistics.RADIATIVE_POWER |
                                           GlobalStatistics.HFI | GlobalStatistics.HCFB | GlobalStatistics.HROS_MAP | GlobalStatistics.FROS_MAP |
                                           GlobalStatistics.BROS_MAP | GlobalStatistics.RSS_MAP | GlobalStatistics.RAZ_MAP | GlobalStatistics.FMC_MAP |
                                           GlobalStatistics.CFB_MAP | GlobalStatistics.CFC_MAP | GlobalStatistics.SFC_MAP | GlobalStatistics.TFC_MAP |
                                           GlobalStatistics.FI_MAP | GlobalStatistics.FL_MAP | GlobalStatistics.CURINGDEGREE_MAP | GlobalStatistics.GREENUP_MAP |
                                           GlobalStatistics.PC_MAP | GlobalStatistics.PDF_MAP | GlobalStatistics.CBH_MAP | GlobalStatistics.TREE_HEIGHT_MAP |
                                           GlobalStatistics.FUEL_LOAD_MAP | GlobalStatistics.CFL_MAP | GlobalStatistics.GRASSPHENOLOGY_MAP |
                                           GlobalStatistics.ROSVECTOR_MAP | GlobalStatistics.DIRVECTOR_MAP |
                                           GlobalStatistics.CRITICAL_PATH | GlobalStatistics.CRITICAL_PATH_PERCENTAGE,
                                     filename: string, time: string|DateTime|TimeRange, interpMethod: Output_GridFileInterpolation, scen: Scenario): Output_GridFile {
    let ogf = this.outputs.newGridFile(scen);
    ogf.filename = filename;
    if (typeof time === "string") {
      ogf.outputTime = time;
    }
    else {
      if (time instanceof TimeRange) {
        if (typeof time.endTime === "string") {
          ogf.outputTime = time.endTime;
        }
        else {
          ogf.lOutputTime = time.endTime;
        }
        if (time.startTime != null) {
          if (typeof time.startTime === "string") {
            ogf.startOutputTime = time.startTime;
          }
          else {
            ogf.lStartOutputTime = time.startTime;
          }
        }
      }
      else {
        ogf.lOutputTime = time;
      }
    }
    ogf.scenarioName = scen.getId();
    ogf.statistic = stat;
    ogf.interpMethod = interpMethod;
    return ogf;
  }
  
  /**
   * Removes the output grid file from a scenario
   */
  public removeOutputGridFileFromScenario(stat: Output_GridFile): boolean {
    return this.outputs.removeOutputGridFile(stat);
  }
  
  /**
   * Add a vector file output to a scenario.
   * @param type Either 'SHP' or 'KML'.
   * @param filename The name of the output file. Can either be the actual file path 
   * 				   or the attachment URL returned from {@link addAttachment}
   * @param perimStartTime The time to start output of the perimeter.
   * @param perimEndTime The time to stop output of the perimeter.
   * @param scen The scenario to output the data for.
   * @return VectorFile
   */
  public addOutputVectorFileToScenario(type: VectorFileType, filename: string, perimStartTime: string|DateTime, perimEndTime: string|DateTime, scen: Scenario): VectorFile {
    let ovf = this.outputs.newVectorFile(scen);
    ovf.filename = filename;
    ovf.type = type;
    ovf.multPerim = false;
    ovf.perimActive = false;
    if (typeof perimStartTime === "string") {
      ovf.perimStartTime = perimStartTime;
    }
    else {
      ovf.lPerimStartTime = perimStartTime;
    }
    if (typeof perimEndTime === "string") {
      ovf.perimEndTime = perimEndTime;
    }
    else {
      ovf.lPerimEndTime = perimEndTime;
    }
    return ovf;
  }
  
  /**
   * Removes the output vector file from a scenario
   */
  public removeOutputVectorFileFromScenario(stat: VectorFile): boolean {
    return this.outputs.removeOutputVectorFile(stat);
  }
  
  /**
   * Add a summary output file to a scenario.
   * @param scen The scenario to add the summary file to.
   * @param filename The name of the file to output to. Can either be the actual file path 
   * 				   or the attachment URL returned from {@link addAttachment}
   */
  public addOutputSummaryFileToScenario(scen: Scenario, filename: string): SummaryFile {
    let sum = this.outputs.newSummaryFile(scen);
    sum.filename = filename;
    return sum;
  }
  
  /**
   * Removes the output summary file from a scenario
   */
  public removeOutputSummaryFileFromScenario(stat: SummaryFile): boolean {
    return this.outputs.removeOutputSummaryFile(stat);
  }
  
  /**
   * Add a stats file to a scenario. If you want to set the type of file exported
   * instead of relying on the file extension use the {@code fileType} parameter
   * of the returned object.
   * @param scen The scenario to add the stats file to.
   * @param filename The name of the file to output to.
   * @returns The newly created stats file export.
   */
  public addOutputStatsFileToScenario(scen: Scenario, filename: string): StatsFile {
    let stat = this.outputs.newStatsFile(scen);
    stat.filename = filename;
    return stat;
  }
  
  /**
   * Remove a stats file from a scenario.
   * @param stat The stats file to remove. 
   */
  public removeOutputStatsFileFromScenario(stat: StatsFile): boolean {
    return this.outputs.removeOutputStatsFile(stat);
  }
  
  /**
   * Stream output files to the MQTT connection.
   */
  public streamOutputToMqtt() {
    this.streamInfo.push(new MqttOutputStreamInfo());
  }
  
  /**
   * Clear the stream output files for the MQTT connection.
   */
  public clearStreamOutputToMqtt() {
    var rem: Array<OutputStreamInfo> = [];
    for(var i = 0; i < this.streamInfo.length; i++) {
      if (this.streamInfo[i] instanceof MqttOutputStreamInfo) {
        rem.push(this.streamInfo[i]);
      }
    }
    
    for(var i = 0; i < rem.length; i++) {
      var index = this.streamInfo.indexOf(rem[i]);
      this.streamInfo.splice(index, 1);
    }
  }
  
  /**
   * Stream output files to a GeoServer instance. Currently only GeoTIFF files can be streamed to GeoServer.
   * @param username The username to authenticate on the GeoServer instance with.
   * @param password The password to authenticate on the GeoServer instance with. WARNING: the password will be stored in plain text.
   * @param url The URL of the GeoServer instance. The web interface should be at {url}/web.
   * @param workspace The name of the workspace to upload the file to. If the workspace doesn't exist it will be created.
   * @param coverageStore A prefix on the filename that will be used when creating the coverage store.
   *                      The full coverage store name will be "coverageStore_filename" or just "filename" if coverageStore is an empty string.
   * @param srs The declared spatial reference system of the uploaded file. If not provided the uploaded coverage will not be enabled.
   */
  public streamOutputToGeoServer(username: string, password: string, url: string, workspace: string, coverageStore: string, srs: string|null = null): void {
    let geo = new GeoServerOutputStreamInfo();
    geo.coverageStore = coverageStore;
    geo.declaredSrs = srs;
    geo.password = password;
    geo.url = url;
    geo.username = username;
    geo.workspace = workspace;
    this.streamInfo.push(geo);
  }
  
  /**
   * Test the validity of a filename.
   * - The filename must not contain any of the following characters: \ / :  * ? " < > |
   * - The filename must not begin with a dot (.)
   * - The filename may not be any of the following: nul, prn, con, aux, lpt#, com#
   * @param filename The filename to test for validity.
   */
  private validateFilename(filename: string): boolean {
    let rg1 = /^[^\\/:\*\?"<>\|]+$/; //don't allow \ / :  * ? " < > |
    let rg2 = /^\./; //don't start with a .
    let rg3 = /^(nul|prn|con|aux|lpt[0-9]|com[1-9])(\.|$)/i; //some special dissallowed names
    return rg1.test(filename) && !rg2.test(filename) && !rg3.test(filename);
  }
  
  /**
   * Add a file attachment to the project. Attachments can be used anywhere a filename would be used.
   * @param filename The name of the file to attach. Must be a valid Windows filename. See {@link validateFilename}
   * @param contents The file contents. Must still be valid if streamed to a file with UTF-8 encoding.
   * @returns Will return false if the filename is not valid, otherwise the URL to use as the filename
   *          when referencing the attachment will be returned.
   * @example
   * ```javascript
   * fs.readFile("/mnt/location/file.txt", "utf8", (err, data) => {
   *     //on successful read data will be a string containing the contents of the file
   *     let wise = new WISE();
   *     let att = wise.addAttachment("file.txt", data);
   *     wise.addFileIgnition("2019-02-20T12:00:00", att, "No comment");
   * });
   * 
   * fs.readFile("/mnt/location/file.kmz", (err, data) => {
   *     //on successful read data will be a Buffer containing the contents of the file
   *     let wise = new WISE();
   *     let att = wise.addAttachment("file.kmz", data);
   *     wise.addFileIgnition("2019-02-20T12:00:00", att, "No comment");
   * });
   * ```
   */
  public addAttachment(filename: string, contents: string|Buffer): string|boolean {
    if (!this.validateFilename(filename)) {
      return false;
    }
    let name = "attachment:/" + this.attachmentIndex + "/" + encodeURIComponent(filename);
    this.attachmentIndex = this.attachmentIndex + 1;
    let stream = new FileAttachment(name, contents);
    this.attachments.push(stream);
    return name;
  }
  
  /**
   * Sends the job to the job manager for execution.
   * @throws This method can only be called once at a time per instance.
   */
  public beginJob(callback: (job: WISE, name: string) => any): void {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    this.beginJobInternal((wrapper) => callback(wrapper.job, wrapper.name));
  }
  
  /**
   * Sends the job to the job manager for execution.
   * @returns A {@link StartJobWrapper} that contains the name of the newly
   *          started job as well as the current {@link WISE} object.
   * @throws This method can only be called once at a time per instance.
   */
  public async beginJobPromise(): Promise<StartJobWrapper> {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    return await new Promise<StartJobWrapper>((resolve, reject) => {
      this.beginJobInternal(resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /**
   * Sends the job to the job manager for validation.
   * @throws This method can only be called once at a time per instance.
   */
  public validateJob(callback: (job: WISE, name: string) => any): void {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    this.jobOptions.validate = true;
    this.beginJobInternal((wrapper) => callback(wrapper.job, wrapper.name));
  }
  
  /**
   * Sends the job to the job manager for validation. The job won't run
   * completely until the user issues the rerun command later.
   * @returns A {@link StartJobWrapper} that contains the name of the newly
   * 			started job as well as the current {@link WISE} object.
   * @throws This method can only be called once at a time per instance.
   */
  public async validateJobPromise(): Promise<StartJobWrapper> {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    this.jobOptions.validate = true;
    return await new Promise<StartJobWrapper>((resolve, reject) => {
      this.beginJobInternal(resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /*
    * This method connects to the builder and begins the job
    */
  private beginJobInternal(callback: (wrapper: StartJobWrapper) => any, error?: (message: any) => any): void {
    if (!this.isValid()) {
      throw new Error('Not all required values have been set.');
    }
    this.fetchState = -1;
    let retval = "";
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, () => {
      WISELogger.getInstance().debug("connected to builder, starting job !");
      builder.write(SocketMsg.STARTUP + SocketMsg.NEWLINE);
      builder.write(SocketMsg.BEGINDATA + SocketMsg.NEWLINE);
      builder.write(WISE.PARAM_COMMENT + SocketMsg.NEWLINE);
      builder.write(this.comments + SocketMsg.NEWLINE);
      
      for (let att of this.attachments) {
        att.stream(builder);
      }
      
      this.inputs.stream(builder);
      this.outputs.stream(builder);
      this.timestepSettings.stream(builder);
      for (let str of this.streamInfo) {
        str.stream(builder);
      }
      this.exportUnits.stream(builder);
      this.jobOptions.stream(builder);
      builder.write(SocketMsg.ENDDATA + SocketMsg.NEWLINE);
      builder.write(SocketMsg.STARTJOB + SocketMsg.NEWLINE);
    });
    builder.on('data', (data) => {
      retval = data.toString();
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
        callback(new StartJobWrapper(this, retval));
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
}

export class StartJobWrapper {
  /**
   * The W.I.S.E. instance that started the job.
   */
  public job: WISE;
  
  /**
   * The name of the started job.
   */
  public name: string;
  
  public constructor(job: WISE, name: string) {
    this.job = job;
    this.name = name;
  }
}

export enum StopPriority {
  /** Stop the job at the soonest time available (may not occur until currently running simulations have completed).  */
  NONE = 0,
  /** Stop at the soonest time available but attempt to terminate the job if still running after 5 minutes.  */
  SOON = 1,
  /** Attempt to terminate the executing process immediately.  */
  NOW = 2
}

export class Admin {
  
  /**
   * Creates a TAR archive of the specified job. Note this does not delete the job directory.
   * @param jobname The name of the job to archive.
   */
  public static archiveTar(jobname: string, callback?: () => any): void {
    (new AdminHelper()).archiveTar(jobname, callback);
  }
  
  /**
   * Creates a TAR archive of the specified job. Note this does not delete the job directory.
   * @param jobname The name of the job to archive.
   */
  public static async archiveTarPromise(jobname: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      (new AdminHelper()).archiveTar(jobname, resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /**
   * Creates a ZIP archive of the specified job. Note this does not delete the job directory.
   * @param jobname The name of the job to archive.
   */
  public static archiveZip(jobname: string, callback?: () => any): void {
    (new AdminHelper()).archiveZip(jobname, callback);
  }
  
  /**
   * Creates a ZIP archive of the specified job. Note this does not delete the job directory.
   * @param jobname The name of the job to archive.
   */
  public static async archiveZipPromise(jobname: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      (new AdminHelper()).archiveZip(jobname, resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /**
   * Deletes the specified job directory. This is not reversible.
   * @param jobname The name of the job to delete.
   */
  public static deleteJob(jobname: string, callback?: () => any): void {
    (new AdminHelper()).deleteJob(jobname, callback);
  }
  
  /**
   * Deletes the specified job directory. This is not reversible.
   * @param jobname The name of the job to delete.
   */
  public static async deleteJobPromise(jobname: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      (new AdminHelper()).deleteJob(jobname, resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /**
   * Requests that a specific job stop executing.
   * @param jobname The job to stop executing.
   * @param priority The priority with which to stop the job.
   */
  public static stopJob(jobname: string, priority: StopPriority = StopPriority.NONE, callback?: () => any): void {
    (new AdminHelper()).stopJob(jobname, priority, callback);
  }
  
  /**
   * Requests that a specific job stop executing.
   * @param jobname The job to stop executing.
   * @param priority The priority with which to stop the job.
   */
  public static async stopJobPromise(jobname: string, priority: StopPriority = StopPriority.NONE): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      (new AdminHelper()).stopJob(jobname, priority, resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /**
   * Echos the list of complete jobs (both failed and succeeded) in a format that can be used in a <select> tag.
   */
  public static echoCompleteJobOptions(callback?: (options: string) => any): void {
    (new AdminHelper()).echoCompleteJobOptions(callback);
  }
  
  /**
   * Echos the list of complete jobs (both failed and succeeded) in a format that can be used in a <select> tag.
   * @returns A string containing a list of `<option>` tags with the completed job list that can be used
   *          to populate a webpage.
   */
  public static async echoCompleteJobOptionsPromise(): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      (new AdminHelper()).echoCompleteJobOptions(resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /**
   * Echos the list of running jobs in a format that can be used in a <select> tag.
   */
  public static echoRunningJobOptions(callback?: (options: string) => any): void {
    (new AdminHelper()).echoRunningJobOptions(callback);
  }
  
  /**
   * Echos the list of running jobs in a format that can be used in a <select> tag.
   * @returns A string containing a list of `<option>` tags with the running job list
   *          that can be used to populate a webpage.
   */
  public static async echoRunningJobOptionsPromise(): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      (new AdminHelper()).echoRunningJobOptions(resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /**
   * Echos the list of queued jobs in a format that can be used in a <select> tag.
   */
  public static echoQueuedJobOptions(callback?: (options: string) => any): void {
    (new AdminHelper()).echoQueuedJobOptions(callback);
  }
  
  /**
   * Echos the list of queued jobs in a format that can be used in a <select> tag.
   * @returns A string containing a list of `<option>` tags with the queued job list
   *          that can be used to populate a webpage.
   */
  public static async echoQueuedJobOptionsPromise(): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      (new AdminHelper()).echoQueuedJobOptions(resolve, reject);
    })
    .catch(err => { throw err });
  }
}

class AdminHelper extends IWISESerializable {
  
  /**
   * Creates a TAR archive of the specified job. Note this does not delete the job directory.
   * @param jobname The name of the job to archive.
   */
  public archiveTar(jobname: string, callback?: () => any, error?: (message: any) => any): void {
    this.fetchState = -1;
    let data = "TAR " + jobname;
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      builder.write(data + SocketMsg.NEWLINE, (err) => {
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
        callback();
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
  
  /**
   * Creates a ZIP archive of the specified job. Note this does not delete the job directory.
   * @param jobname The name of the job to archive.
   */
  public archiveZip(jobname: string, callback?: () => any, error?: (message: any) => any): void {
    this.fetchState = -1;
    let data = "ZIP " + jobname;
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      builder.write(data + SocketMsg.NEWLINE, (err) => {
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
        callback();
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
  
  /**
   * Deletes the specified job directory. This is not reversible.
   * @param string jobname The name of the job to delete.
   */
  public deleteJob(jobname: string, callback?: () => any, error?: (message: any) => any): void {
    this.fetchState = -1;
    let data = "DELETE " + jobname;
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      builder.write(data + SocketMsg.NEWLINE, (err) => {
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
        callback();
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
  
  /**
   * Requests that a specific job stop executing.
   * @param jobname The job to stop executing.
   * @param priority The priority with which to stop the job.
   */
  public stopJob(jobname: string, priority: StopPriority = StopPriority.NONE, callback?: () => any, error?: (message: any) => any): void {
    this.fetchState = -1;
    let data = "STOP_JOB " + jobname + "|" + priority;
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      builder.write(data + SocketMsg.NEWLINE, (err) => {
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
        callback();
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
  
  /**
   * Echos the list of complete jobs (both failed and succeeded) in a format that can be used in a <select> tag.
   */
  public echoCompleteJobOptions(callback?: (options: string) => any, error?: (message: any) => any): void {
    this.fetchState = -1;
    let data = "LIST_OPTIONS_COMPLETE";
    let result = "";
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      builder.write(data + SocketMsg.NEWLINE);
    });
    builder.on('data', (data) => {
      let job = data.toString();
      if (job.indexOf('COMPLETE') >= 0) {
        builder.end();
      }
      else {
        job = job.replace(/[\r\n]/g, '');
        result += '<option data="' + job + '">' + job + '</option>\n';
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
        callback(result);
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
  
  /**
   * Echos the list of running jobs in a format that can be used in a <select> tag.
   */
  public echoRunningJobOptions(callback?: (options: string) => any, error?: (message: any) => any): void {
    this.fetchState = -1;
    let data = "LIST_OPTIONS_RUNNING";
    let result = "";
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      builder.write(data + SocketMsg.NEWLINE);
    });
    builder.on('data', (data) => {
      let job = data.toString();
      if (job.indexOf('COMPLETE') >= 0) {
        builder.end();
      }
      else {
        job = job.replace(/[\r\n]/g, '');
        result += '<option data="' + job + '">' + job + '</option>\n';
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
        callback(result);
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
  
  /**
   * Echos the list of queued jobs in a format that can be used in a <select> tag.
   */
  public echoQueuedJobOptions(callback?: (options: string) => any, error?: (message: any) => any): void {
    this.fetchState = -1;
    let data = "LIST_OPTIONS_QUEUED";
    let result = "";
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      builder.write(data + SocketMsg.NEWLINE);
    });
    builder.on('data', (data) => {
      let job = data.toString();
      if (job.indexOf('COMPLETE') >= 0) {
        builder.end();
      }
      else {
        job = job.replace(/[\r\n]/g, '');
        result += '<option data="' + job + '">' + job + '</option>\n';
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
        callback(result);
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
}
