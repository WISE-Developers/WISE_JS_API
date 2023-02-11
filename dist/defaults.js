"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.License = exports.ComponentType = exports.JobDefaults = exports.ServerConfiguration = void 0;
/** ignore this comment */
const net = require("net");
const protobuf = require("protobufjs");
const fs = require("fs");
const path = require("path");
const npmConf = require("npm-conf");
const wiseGlobals_1 = require("./wiseGlobals");
/**
 * Server configuration details. Can be loaded from
 */
class ServerConfiguration {
    constructor(jobPath) {
        this.builderPort = 32479;
        this.builderAddress = "127.0.0.1";
        this.mqttPort = 1883;
        this.mqttAddress = "127.0.0.1";
        this.mqttTopic = "wise";
        try {
            var rootPath;
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
                let config = jobDefaultsDefinition.toObject(JSON.parse(fileData.toString()));
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
    log() {
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
exports.ServerConfiguration = ServerConfiguration;
class JobDefaults extends wiseGlobals_1.IWISESerializable {
    constructor() {
        super();
        this.fgmDefaults = new wiseGlobals_1.FGMOptions();
        this.fbpDefaults = new wiseGlobals_1.FBPOptions();
        this.fmcDefaults = new wiseGlobals_1.FMCOptions();
        this.interpDefaults = new wiseGlobals_1.FWIOptions();
        this.metadataDefaults = new wiseGlobals_1.VectorMetadata();
    }
    /**
     * Set the port used to communicate with the Java builder.
     * @param port The port to communicate on. Must be the same one the Java builder has been configured to listen on.
     * @deprecated Set the port and address directly using {@link SocketHelper#initialize(string,int)}.
     */
    setBuilderPort(port) {
        wiseGlobals_1.SocketHelper.initialize(wiseGlobals_1.SocketHelper.getAddress(), port);
    }
    /**
     * Set the IP address of the machine the Java builder is running on.
     * @param address The IP address of the computer running the Java builder application.
     * @deprecated Set the port and address directly using {@link SocketHelper#initialize(string,int)}.
     */
    setBuilderIP(address) {
        wiseGlobals_1.SocketHelper.initialize(address, wiseGlobals_1.SocketHelper.getPort());
    }
    /**
     * Get the job defaults from the job manager.
     */
    getDefaults(callback) {
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
    async getDefaultsPromise() {
        if (this.fetchState < 0) {
            throw new Error("Multiple concurrent reqeusts");
        }
        return await new Promise((resolve, reject) => {
            this.getDefaultsInternal(resolve, reject);
        })
            .catch(err => { throw err; });
    }
    /**
     * @hidden
     */
    protoPerimeterToJavascript(units) {
        switch (units) {
            case 0:
                return wiseGlobals_1.Units.MI;
            case 1:
                return wiseGlobals_1.Units.KM;
            case 3:
                return wiseGlobals_1.Units.FT;
            case 4:
                return wiseGlobals_1.Units.YARD;
            case 5:
                return wiseGlobals_1.Units.CHAIN;
            default:
                return wiseGlobals_1.Units.M;
        }
    }
    /**
     * @hidden
     */
    protoAreaToJavascript(units) {
        switch (units) {
            case 0:
                return wiseGlobals_1.Units.ACRE;
            case 1:
                return wiseGlobals_1.Units.KM2;
            case 3:
                return wiseGlobals_1.Units.HA;
            case 4:
                return wiseGlobals_1.Units.MI2;
            case 5:
                return wiseGlobals_1.Units.FT2;
            case 6:
                return wiseGlobals_1.Units.YD2;
            default:
                return wiseGlobals_1.Units.M2;
        }
    }
    getDefaultsInternal(callback, error) {
        var _a, _b, _c;
        this.fetchState = -1;
        let defaults = null;
        var protoPath;
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
                defaults = jobDefaultsDefinition.toObject(JSON.parse(fileData.toString()));
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
            let builder = net.connect({ port: wiseGlobals_1.SocketHelper.getPort(), host: wiseGlobals_1.SocketHelper.getAddress() }, function () {
                wiseGlobals_1.WISELogger.getInstance().debug("connected to builder, getting defaults !");
                builder.write(wiseGlobals_1.SocketMsg.STARTUP + wiseGlobals_1.SocketMsg.NEWLINE);
                builder.write(wiseGlobals_1.SocketMsg.GETDEFAULTS + wiseGlobals_1.SocketMsg.NEWLINE);
            });
            builder.on('data', (data) => {
                let rawDefaults = data.toString().split(wiseGlobals_1.SocketMsg.NEWLINE);
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
                wiseGlobals_1.WISELogger.getInstance().debug("disconnected from builder");
            });
        }
        //look at the contents of the parsed file for defaults
        else {
            //FGM defaults
            this.fgmDefaults.maxAccTS = new wiseGlobals_1.Duration();
            this.fgmDefaults.maxAccTS.fromString(defaults.fgmOptions.maxAccTs);
            this.fgmDefaults.distRes = defaults.fgmOptions.distanceResolution;
            this.fgmDefaults.perimRes = defaults.fgmOptions.perimeterResolution;
            this.fgmDefaults.minimumSpreadingROS = defaults.fgmOptions.minimumSpreadingRos;
            this.fgmDefaults.stopAtGridEnd = defaults.fgmOptions.stopAtGridEnd;
            this.fgmDefaults.breaching = defaults.fgmOptions.breaching;
            this.fgmDefaults.dynamicSpatialThreshold = defaults.fgmOptions.dynamicSpatialThreshold;
            this.fgmDefaults.spotting = defaults.fgmOptions.spotting;
            this.fgmDefaults.purgeNonDisplayable = defaults.fgmOptions.purgeNonDisplayable;
            this.fgmDefaults.dx = (_a = defaults.fgmOptions.dx) !== null && _a !== void 0 ? _a : null;
            this.fgmDefaults.dy = (_b = defaults.fgmOptions.dy) !== null && _b !== void 0 ? _b : null;
            this.fgmDefaults.dt = new wiseGlobals_1.Duration();
            this.fgmDefaults.dt.fromString((_c = defaults.fgmOptions.dt) !== null && _c !== void 0 ? _c : 'PT0M');
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
    tryParse(type, data) {
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
exports.JobDefaults = JobDefaults;
JobDefaults.TYPE_JOBLOCATION = "JOBLOCATION";
/**
 * Different W.I.S.E. components that may use third party licenses.
 */
var ComponentType;
(function (ComponentType) {
    /**
     * The W.I.S.E. Manager Java application.
     */
    ComponentType[ComponentType["WISE_MANAGER"] = 0] = "WISE_MANAGER";
    /**
     * The W.I.S.E. Builder Java application.
     */
    ComponentType[ComponentType["WISE_BUILDER"] = 1] = "WISE_BUILDER";
    /**
     * The Windows build of W.I.S.E..
     */
    ComponentType[ComponentType["WISE_WINDOWS"] = 2] = "WISE_WINDOWS";
    /**
     * The Linux build of W.I.S.E..
     */
    ComponentType[ComponentType["WISE_LINUX"] = 3] = "WISE_LINUX";
    /**
     * An error occurred and the component is unknown.
     */
    ComponentType[ComponentType["UNKNOWN"] = 4] = "UNKNOWN";
})(ComponentType = exports.ComponentType || (exports.ComponentType = {}));
/**
 * Details of a license used by a third party library in W.I.S.E..
 */
class License {
    constructor() { }
    static parseComponents(value) {
        let retval = new Array();
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
    static async getLicensesPromise() {
        return await new Promise((resolve, reject) => {
            License.getLicenses(resolve, reject);
        })
            .catch(err => { throw err; });
    }
    /**
     * Get the list of licenses used by the various W.I.S.E. components.
     * @param callback A method that will be called with the results of the license lookup.
     * @param error A method that will be called if the license lookup failed.
     */
    static getLicenses(callback, error) {
        let retval = new Array();
        let rawValue = "";
        let builder = net.connect({ port: wiseGlobals_1.SocketHelper.getPort(), host: wiseGlobals_1.SocketHelper.getAddress() }, function () {
            wiseGlobals_1.WISELogger.getInstance().debug("connected to builder, getting defaults !");
            builder.write("GET_LICENSES" + wiseGlobals_1.SocketMsg.NEWLINE);
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
            wiseGlobals_1.WISELogger.getInstance().debug("disconnected from builder");
        });
    }
}
exports.License = License;
//# sourceMappingURL=defaults.js.map