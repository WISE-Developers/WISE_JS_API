/**
 * A few simulation options contain default values that are
 * read by W.I.S.E. Builder during startup. This module allows
 * you to query those defaults for use when building new
 * simulations.
 * 
 * Example
 * -------
 * 
 * Asynchronously retrieve the default values.
 * 
 * ```javascript
 * let jDefaults = await new JobDefaults().getDeafultsPromise();
 * ```
 */

/** ignore this comment */
import * as net from "net";
import * as protobuf from "protobufjs";
import * as fs from "fs";
import * as path from "path";
import * as npmConf from "npm-conf";
import { FGMOptions, FBPOptions, FMCOptions, FWIOptions, VectorMetadata, SocketHelper, SocketMsg, WISELogger, IWISESerializable, Duration, Units } from "./wiseGlobals";

/**
 * Default values for fire growth
 * model options.
 * @hidden
 */
interface IFgmDefaults {
  //The default maximum timestep during acceleration
  maxAccTs: string;
  
  //The default distance resolution (m)
  distanceResolution: number;
  
  //The default perimeter resolution (m)
  perimeterResolution: number;
  
  //The default minimum spreading ROS
  minimumSpreadingRos: number;
  
  //The default for whether the simulation should stop when the fire reaches the end of the grid
  stopAtGridEnd: boolean;
  
  //The default for whether the simulation should use breaching
  breaching: boolean;
  
  //The default for whether the simulation should use a dynamic spatial threshold
  dynamicSpatialThreshold: boolean;
  
  //The default for whether the simulation should use spotting
  spotting: boolean;
  
  //The default for whether the simulation should purge non-displayable timesteps
  purgeNonDisplayable: boolean;
  
  //The default for the ignition location tweaking parameter dx
  dx?: number;
  
  //The default for the ignition location tweaking parameter dy
  dy?: number;
  
  //The default for the ignition start time tweaking parameter dt
  dt?: string;
  
  //The defualt for whether the growth percentile should be used
  growthPercentileApplied: boolean;
  
  //The default growth percentile
  growthPercentile: number;
}

/**
 * Default values for FBP options.
 * @hidden
 */
interface IFbpDefaults {
  //The default for whether wind effects are enabled
  windEffect: boolean;
  
  //The default for whether green-up is enabled
  greenUp: boolean;
  
  //The default for whether terrain effect is enabled
  terrainEffect: boolean;
}

/**
 * Default values for FMC options.
 * @hidden
 */
interface IFmcDefaults {
  //The default elevation where no data exists
  noDataElev: number;
  
  //The default percent override
  percentOverride: number;
  
  //The default terrain value
  terrain: boolean;
}

/**
 * Default fire weather index options.
 * @hidden
 */
interface IFwiDefaults {
  //The default for enabling spatial interpolation on FWI values
  fwiSpatialInterpolation: boolean;
  
  //The default for calculating FWI values from spatially interpolated weather
  fwiFromSpatialWeather: boolean;
  
  //The default for applying history to effected FWI values
  historyOnEffectedFwi: boolean;
  
  //The default enabled/disabled state for burning conditions
  burningConditionsOn: boolean;
  
  //The default for enabling temporal interpolation for FWI values
  fwiTemporalInterpolation: boolean;
}

/**
 * Default values for summary file outputs.
 * @hidden
 */
interface ISummaryFileDefaults {
  //Add a summary of input values to the summary file
  inputSummary: boolean;
  
  //Add the elevation info to the summary file
  elevationInfo: boolean;
  
  //Add the location information to the summary file
  location: boolean;
  
  //Add the grid details to the summary file
  gridInfo: boolean;
  
  //Add the time to execute the simulation to the summary file
  timeToExecute: boolean;
}

/**
 * Detault settings for the metadata stored in vector
 * file outputs.
 * @hidden
 */
interface IVectorFileMetadataDefaults {
  //The default units to use for perimeter values
  perimeterUnit: number;
  
  //The default units to use for area values
  areaUnits: number;
  
  //Add the active perimeter size to the metadata
  activePerimeter: boolean;
  
  //Add the total perimeter to the metadata
  totalPerimeter: boolean;
  
  //Add the fire size to the metadata
  fireSize: boolean;
  
  //Add the simulation date to the metadata
  simulationDate: boolean;
  
  //Add the ignition name to the metadata
  ignitionName: boolean;
  
  //Add the job name to the metadata
  jobName: boolean;
  
  //Add the scenario name to the metadata
  scenarioName: boolean;
  
  //Add the W.I.S.E. version to the metadata
  wiseVersion: boolean;
}

/**
 * Default values for a selection of job inputs.
 * @hidden
 */
interface IJsonDefaults {
  //The default fire growth model options
  fgmOptions: IFgmDefaults;
  
  //The default FBP options
  fbpOptions: IFbpDefaults;
  
  //The default FMC options
  fmcOptions: IFmcDefaults;
  
  //The default FWI options
  fwiOptions: IFwiDefaults;
  
  //Default settings for summary file outputs
  summaryFileDefaults: ISummaryFileDefaults;
  
  //Default settings for vector file metadata
  vectorFileMetadata: IVectorFileMetadataDefaults;
}

/**
 * Details for connecting to an MQTT broker. Can be used by W.I.S.E. for communicating
 * status messages, Builder and Manager for sharing files and starting jobs, and the
 * API for listening for job updates.
 * @hidden
 */
interface IMqttConfiguration {
  //The IP address or hostname of the MQTT broker
  hostname: string;
  
  //The port that MQTT is running on
  port: number;
  
  //The base topic string to use
  topic: string;
  
  //An optional username required to authenticate with the MQTT broker
  username: string;
  
  //An optional password required to authenticate with the MQTT broker
  password: string;
}

/**
 * Details for how the API will connect to their related instance
 * of Builder.
 * @hidden
 */
interface IBuilderConfiguration {
  //The hostname of the machine the Builder is running on
  hostname: string;
  
  //The port that Builder is listening on
  port: number;
}

/**
 * General server configuration details.
 * @hidden
 */
interface IServerConfiguration {
  //Communication between all applications will take place over MQTT
  mqtt: IMqttConfiguration;
  
  //Settings the API will use to connect to Builder
  builder: IBuilderConfiguration;
  
  //The directory where sample data is stored for testing purposes
  exampleDirectory: string;
}

/**
 * Server configuration details. Can be loaded from 
 */
export class ServerConfiguration {
  public builderPort: number = 32479;
  
  public builderAddress: string = "127.0.0.1";
  
  public mqttPort: number = 1883;
  
  public mqttAddress: string = "127.0.0.1";
  
  public mqttTopic: string = "wise";
  
  public mqttUsername?: string;
  
  public mqttPassword?: string;
  
  public exampleDirectory: string;
  
  private configLocation: string|null;
  
  constructor(jobPath?: string) {
    try {
      var rootPath: string;
      try {
        rootPath = path.dirname(require.resolve("WISE_JS_API/package.json"));
      }
      catch (e2) {
        //if the package can't be resolved it will throw a MODULE_NOT_FOUND error
        rootPath = "./";
      }
      var protoPath = path.join(rootPath, "proto");
      
      this.configLocation = jobPath;
      //if the user didn't specify a job directory try loading one from the npm configuration
      if (this.configLocation == null || this.configLocation.length == 0) {
        const conf = npmConf();
        this.configLocation = conf.get('WISE_JS_API:job_directory');
        
        //use the config.json from the jobs directory if available, otherwise look locally
        if (this.configLocation == null || this.configLocation.length == 0) {
          const internalConfigPath = path.join(rootPath, "config", "config.json");
          const internalConfig = JSON.parse(fs.readFileSync(internalConfigPath, 'utf8'));
          if (internalConfig.hasOwnProperty("config_path")) {
            this.configLocation = internalConfig["config_path"];
          }
          else {
            this.configLocation = "./";
          }
        }
      }
      this.configLocation = path.join(this.configLocation, "config.json");
      
      if (fs.existsSync(this.configLocation)) {
        let definition = protobuf.loadSync(path.join(protoPath, "wise_config.proto"));
        let jobDefaultsDefinition = definition.lookupType("wise.api.ServerConfiguration");
        let fileData = fs.readFileSync(this.configLocation, null);
        let config = <IServerConfiguration>jobDefaultsDefinition.toObject(JSON.parse(fileData.toString()));
        
        this.builderPort = config.builder.port;
        this.builderAddress = config.builder.hostname;
        if (config.hasOwnProperty("mqtt")) {
          this.mqttPort = config.mqtt.port;
          this.mqttAddress = config.mqtt.hostname;
          this.mqttUsername = config.mqtt.username;
          this.mqttPassword = config.mqtt.password;
          this.mqttTopic = config.mqtt.topic;
        }
        this.exampleDirectory = config.exampleDirectory;
        if (this.exampleDirectory != null) {
          if (!this.exampleDirectory.endsWith("/") && !this.exampleDirectory.endsWith("\\")) {
            this.exampleDirectory = this.exampleDirectory + "/";
          }
        }
      }
      else {
        console.log("No configuration file found");
      }
    }
    catch (e) {
      if (e instanceof protobuf.util.ProtocolError) {
        //message is missing required fields
      }
      else {
        //initial message is invalid
      }
    }
  }
  
  /**
   * Log the configuration values to the console.
   */
  public log() {
    if (this.configLocation != null && fs.existsSync(this.configLocation))
    console.log(`Reading configuration from "${this.configLocation}".`);
    else
    console.log("No configuration file was found.");
    
    console.log(`Connecting to W.I.S.E. Builder at ${this.builderAddress}:${this.builderPort}`);
    if (this.mqttAddress != null && this.mqttAddress.length > 0) {
      console.log(`Connecting to an MQTT broker at ${this.mqttAddress}:${this.mqttPort} using topic ${this.mqttTopic}.`);
      
      if (this.mqttUsername != null && this.mqttPassword != null)
      console.log("Connecting to MQTT with a username and password.");
      else if (this.mqttUsername != null)
      console.log("Connecting to MQTT with an unprotected username.");
    }
    
    if (this.exampleDirectory != null && this.exampleDirectory.length > 0)
    console.log(`Example data should be located in ${this.exampleDirectory}.`);
  }
}

export class JobDefaults extends IWISESerializable {
  public static readonly TYPE_JOBLOCATION: string = "JOBLOCATION";
  
  /**
   * The job outputs directory.
   */
  public jobDirectory: string;
  /**
   * The fire growth model defaults.
   */
  public fgmDefaults: FGMOptions;
  /**
   * The FBP defaults
   */
  public fbpDefaults: FBPOptions;
  /**
   * The FMC defaults
   */
  public fmcDefaults: FMCOptions;
  /**
   * The interpolate defaults
   */
  public interpDefaults: FWIOptions;
  /**
   * The metadata defaults
   */
  public metadataDefaults: VectorMetadata;
  
  public constructor() {
    super();
    this.fgmDefaults = new FGMOptions();
    this.fbpDefaults = new FBPOptions();
    this.fmcDefaults = new FMCOptions();
    this.interpDefaults = new FWIOptions();
    this.metadataDefaults = new VectorMetadata();
  }
  
  /**
   * Set the port used to communicate with the Java builder.
   * @param port The port to communicate on. Must be the same one the Java builder has been configured to listen on.
   * @deprecated Set the port and address directly using {@link SocketHelper#initialize(string,int)}.
   */
  public setBuilderPort(port: number) {
    SocketHelper.initialize(SocketHelper.getAddress(), port);
  }
  
  /**
   * Set the IP address of the machine the Java builder is running on.
   * @param address The IP address of the computer running the Java builder application.
   * @deprecated Set the port and address directly using {@link SocketHelper#initialize(string,int)}.
   */
  public setBuilderIP(address: string) {
    SocketHelper.initialize(address, SocketHelper.getPort());
  }
  
  /**
   * Get the job defaults from the job manager.
   */
  public getDefaults(callback?: (defaults: JobDefaults) => any) {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    this.getDefaultsInternal(callback);
  }
  
  /**
   * Get the job defaults from the job manager.
   * @returns The current {@link JobDefaults} object.
   * @throws This method can only be called once at a time per instance.
   */
  public async getDefaultsPromise(): Promise<JobDefaults> {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    return await new Promise<JobDefaults>((resolve, reject) => {
      this.getDefaultsInternal(resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /**
   * @hidden
   */
  private protoPerimeterToJavascript(units: number): Units {
    switch (units) {
      case 0:
      return Units.MI;
      case 1:
      return Units.KM;
      case 3:
      return Units.FT;
      case 4:
      return Units.YARD;
      case 5:
      return Units.CHAIN;
      default:
      return Units.M;
    }
  }
  
  /**
   * @hidden
   */
  private protoAreaToJavascript(units: number): Units {
    switch (units){
      case 0:
      return Units.ACRE;
      case 1:
      return Units.KM2;
      case 3:
      return Units.HA;
      case 4:
      return Units.MI2;
      case 5:
      return Units.FT2;
      case 6:
      return Units.YD2;
      default:
      return Units.M2;
    }
  }
  
  private getDefaultsInternal(callback?: (defaults: JobDefaults) => any, error?: (message: any) => any) {
    this.fetchState = -1;
    let defaults: IJsonDefaults|null = null;
    
    var protoPath: string;
    try {
      protoPath = path.join(path.dirname(require.resolve("wise-js-api/package.json")), "proto");
    }
    catch (e) {
      //if the package can't be resolved it will throw a MODULE_NOT_FOUND error
      protoPath = "./proto";
    }
    
    try {
      //use the local defaults.json if available
      if (fs.existsSync("defaults.json")) {
        let definition = protobuf.loadSync(path.join(protoPath, "wise_defaults.proto"));
        let jobDefaultsDefinition = definition.lookupType("wise.api.JobDefaults");
        let fileData = fs.readFileSync("defaults.json", null);
        defaults = <IJsonDefaults>jobDefaultsDefinition.toObject(JSON.parse(fileData.toString()));
      }
      else {
        console.log("No defaults file found");
      }
    }
    catch (e) {
      if (e instanceof protobuf.util.ProtocolError) {
        //message is missing required fields
      }
      else {
        //initial message is invalid
      }
    }
    
    //query defaults from Builder if no local values are found
    if (defaults == null) {
      let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
        WISELogger.getInstance().debug("connected to builder, getting defaults !");
        builder.write(SocketMsg.STARTUP + SocketMsg.NEWLINE);
        builder.write(SocketMsg.GETDEFAULTS + SocketMsg.NEWLINE);
      });
      builder.on('data', (data) => {
        let rawDefaults = data.toString().split(SocketMsg.NEWLINE);
        rawDefaults.forEach((element, index, array) => {
          if (index & 1) {
            this.tryParse(array[index - 1], array[index]);
          }
        });
        builder.end();
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
    //look at the contents of the parsed file for defaults
    else {
      //FGM defaults
      this.fgmDefaults.maxAccTS = new Duration();
      this.fgmDefaults.maxAccTS.fromString(defaults.fgmOptions.maxAccTs);
      this.fgmDefaults.distRes = defaults.fgmOptions.distanceResolution;
      this.fgmDefaults.perimRes = defaults.fgmOptions.perimeterResolution;
      this.fgmDefaults.minimumSpreadingROS = defaults.fgmOptions.minimumSpreadingRos;
      this.fgmDefaults.stopAtGridEnd = defaults.fgmOptions.stopAtGridEnd;
      this.fgmDefaults.breaching = defaults.fgmOptions.breaching;
      this.fgmDefaults.dynamicSpatialThreshold = defaults.fgmOptions.dynamicSpatialThreshold;
      this.fgmDefaults.spotting = defaults.fgmOptions.spotting;
      this.fgmDefaults.purgeNonDisplayable = defaults.fgmOptions.purgeNonDisplayable;
      this.fgmDefaults.dx = defaults.fgmOptions.dx ?? null;
      this.fgmDefaults.dy = defaults.fgmOptions.dy ?? null;
      this.fgmDefaults.dt = new Duration();
      this.fgmDefaults.dt.fromString(defaults.fgmOptions.dt ?? 'PT0M');
      this.fgmDefaults.growthPercentileApplied = defaults.fgmOptions.growthPercentileApplied;
      this.fgmDefaults.growthPercentile = defaults.fgmOptions.growthPercentile;
      
      //FBP defaults
      this.fbpDefaults.windEffect = defaults.fbpOptions.windEffect;
      this.fbpDefaults.terrainEffect = defaults.fbpOptions.terrainEffect;
      
      //FMC defaults
      this.fmcDefaults.nodataElev = defaults.fmcOptions.noDataElev;
      this.fmcDefaults.perOverride = defaults.fmcOptions.percentOverride;
      this.fmcDefaults.terrain = defaults.fmcOptions.terrain;
      
      //FWI defaults
      this.interpDefaults.fwiSpacInterp = defaults.fwiOptions.fwiSpatialInterpolation;
      this.interpDefaults.fwiFromSpacWeather = defaults.fwiOptions.fwiFromSpatialWeather;
      this.interpDefaults.historyOnEffectedFWI = defaults.fwiOptions.historyOnEffectedFwi;
      this.interpDefaults.burningConditionsOn = defaults.fwiOptions.burningConditionsOn;
      this.interpDefaults.fwiTemporalInterp = defaults.fwiOptions.fwiTemporalInterpolation;
      
      //vector metadata defaults
      this.metadataDefaults.perimUnit = this.protoPerimeterToJavascript(defaults.vectorFileMetadata.perimeterUnit);
      this.metadataDefaults.areaUnit = this.protoAreaToJavascript(defaults.vectorFileMetadata.areaUnits);
      this.metadataDefaults.perimActive = defaults.vectorFileMetadata.activePerimeter;
      this.metadataDefaults.perimTotal = defaults.vectorFileMetadata.totalPerimeter;
      this.metadataDefaults.fireSize = defaults.vectorFileMetadata.fireSize;
      this.metadataDefaults.simDate = defaults.vectorFileMetadata.simulationDate;
      this.metadataDefaults.igName = defaults.vectorFileMetadata.ignitionName;
      this.metadataDefaults.jobName = defaults.vectorFileMetadata.jobName;
      this.metadataDefaults.scenName = defaults.vectorFileMetadata.scenarioName;
      this.metadataDefaults.version = defaults.vectorFileMetadata.wiseVersion;
      
      if (callback) {
        callback(this);
      }
    }
  }
  
  private tryParse(type: string, data: string): boolean {
    if (type === JobDefaults.TYPE_JOBLOCATION) {
      this.jobDirectory = data;
      return true;
    }
    else if (this.fgmDefaults.tryParse(type, data)) {
      return true;
    }
    else if (this.fbpDefaults.tryParse(type, data)) {
      return true;
    }
    else if (this.fmcDefaults.tryParse(type, data)) {
      return true;
    }
    else if (this.interpDefaults.tryParse(type, data)) {
      return true;
    }
    else if (this.metadataDefaults.tryParse(type, data)) {
      return true;
    }
    return false;
  }
}

/**
 * Different W.I.S.E. components that may use third party licenses.
 */
export enum ComponentType {
  /**
   * The W.I.S.E. Manager Java application.
   */
  WISE_MANAGER,
  /**
   * The W.I.S.E. Builder Java application.
   */
  WISE_BUILDER,
  /**
   * The Windows build of W.I.S.E..
   */
  WISE_WINDOWS,
  /**
   * The Linux build of W.I.S.E..
   */
  WISE_LINUX,
  /**
   * An error occurred and the component is unknown.
   */
  UNKNOWN
}

/**
 * Details of a license used by a third party library in W.I.S.E..
 */
export class License {
  /**
   * The W.I.S.E. components that the license is used in.
   */
  public components: Array<ComponentType>;
  
  /**
   * The name of the third party library.
   */
  public libraryName: string;
  
  /**
   * A URL to the libraries homepage.
   */
  public libraryUrl: string;
  
  /**
   * The name of the license used by the library.
   */
  public licenseName: string;
  
  /**
   * A URL to the location where the license details can be viewed.
   */
  public licenseUrl: string;
  
  private constructor() { }
  
  private static parseComponents(value: string): Array<ComponentType> {
    let retval = new Array<ComponentType>();
    if (value != null && value.length > 0) {
      let split = value.split(',');
      for (const s of split) {
        if (s === "builder") {
          retval.push(ComponentType.WISE_BUILDER);
        }
        else if (s === "manager") {
          retval.push(ComponentType.WISE_MANAGER);
        }
        else if (s === "wise_windows") {
          retval.push(ComponentType.WISE_WINDOWS);
        }
        else if (s === "wise_linux") {
          retval.push(ComponentType.WISE_LINUX);
        }
      }
    }
    //if no valid components were found use UNKNOWN
    if (retval.length == 0) {
      retval.push(ComponentType.UNKNOWN);
    }
    return retval;
  }
  
  /**
   * Asynchronously get the list of licenses used by the various W.I.S.E. components.
   */
  public static async getLicensesPromise(): Promise<Array<License>> {
    return await new Promise<Array<License>>((resolve, reject) => {
      License.getLicenses(resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /**
   * Get the list of licenses used by the various W.I.S.E. components.
   * @param callback A method that will be called with the results of the license lookup.
   * @param error A method that will be called if the license lookup failed.
   */
  public static getLicenses(callback?: (licenses: Array<License>) => any, error?: (message: any) => any): void {
    let retval = new Array<License>();
    let rawValue = "";
    
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      WISELogger.getInstance().debug("connected to builder, getting defaults !");
      builder.write("GET_LICENSES" + SocketMsg.NEWLINE);
    });
    builder.on('data', (data) => {
      rawValue += data.toString();
      if (rawValue.endsWith('\n')) {
        builder.end();
      }
    });
    if (error) {
      builder.on('error', (err) => {
        error(err);
        builder.end();
      });
    }
    builder.on('end', () => {
      let split = rawValue.split('|');
      let license = new License();
      let index = 0;
      for (const s of split) {
        if (s === '_') {
          retval.push(license);
          license = new License();
          index = 0;
        }
        else {
          if (s.length > 0) {
            switch (index) {
              case 0:
              license.components = License.parseComponents(s);
              break;
              case 1:
              license.libraryName = (s || "").replace('%7C', '|');
              break;
              case 2:
              license.libraryUrl = (s || "").replace('%7C', '|');
              break;
              case 3:
              license.licenseName = (s || "").replace('%7C', '|');
              break;
              case 4:
              license.licenseUrl = (s || "").replace('%7C', '|');
              break;
              default:
              break;
            }
          }
          index++;
        }
      }
      
      if (callback) {
        callback(retval);
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
}
