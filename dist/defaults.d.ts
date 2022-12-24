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
import { FGMOptions, FBPOptions, FMCOptions, FWIOptions, VectorMetadata, IWISESerializable } from "./wiseGlobals";
/**
 * Server configuration details. Can be loaded from
 */
export declare class ServerConfiguration {
    builderPort: number;
    builderAddress: string;
    mqttPort: number;
    mqttAddress: string;
    mqttTopic: string;
    mqttUsername?: string;
    mqttPassword?: string;
    exampleDirectory: string;
    private configLocation;
    constructor(jobPath?: string);
    /**
     * Log the configuration values to the console.
     */
    log(): void;
}
export declare class JobDefaults extends IWISESerializable {
    static readonly TYPE_JOBLOCATION: string;
    /**
     * The job outputs directory.
     */
    jobDirectory: string;
    /**
     * The fire growth model defaults.
     */
    fgmDefaults: FGMOptions;
    /**
     * The FBP defaults
     */
    fbpDefaults: FBPOptions;
    /**
     * The FMC defaults
     */
    fmcDefaults: FMCOptions;
    /**
     * The interpolate defaults
     */
    interpDefaults: FWIOptions;
    /**
     * The metadata defaults
     */
    metadataDefaults: VectorMetadata;
    constructor();
    /**
     * Set the port used to communicate with the Java builder.
     * @param port The port to communicate on. Must be the same one the Java builder has been configured to listen on.
     * @deprecated Set the port and address directly using {@link SocketHelper#initialize(string,int)}.
     */
    setBuilderPort(port: number): void;
    /**
     * Set the IP address of the machine the Java builder is running on.
     * @param address The IP address of the computer running the Java builder application.
     * @deprecated Set the port and address directly using {@link SocketHelper#initialize(string,int)}.
     */
    setBuilderIP(address: string): void;
    /**
     * Get the job defaults from the job manager.
     */
    getDefaults(callback?: (defaults: JobDefaults) => any): void;
    /**
     * Get the job defaults from the job manager.
     * @returns The current {@link JobDefaults} object.
     * @throws This method can only be called once at a time per instance.
     */
    getDefaultsPromise(): Promise<JobDefaults>;
    /**
     * @hidden
     */
    private protoPerimeterToJavascript;
    /**
     * @hidden
     */
    private protoAreaToJavascript;
    private getDefaultsInternal;
    private tryParse;
}
/**
 * Different W.I.S.E. components that may use third party licenses.
 */
export declare enum ComponentType {
    /**
     * The W.I.S.E. Manager Java application.
     */
    WISE_MANAGER = 0,
    /**
     * The W.I.S.E. Builder Java application.
     */
    WISE_BUILDER = 1,
    /**
     * The Windows build of W.I.S.E..
     */
    WISE_WINDOWS = 2,
    /**
     * The Linux build of W.I.S.E..
     */
    WISE_LINUX = 3,
    /**
     * An error occurred and the component is unknown.
     */
    UNKNOWN = 4
}
/**
 * Details of a license used by a third party library in W.I.S.E..
 */
export declare class License {
    /**
     * The W.I.S.E. components that the license is used in.
     */
    components: Array<ComponentType>;
    /**
     * The name of the third party library.
     */
    libraryName: string;
    /**
     * A URL to the libraries homepage.
     */
    libraryUrl: string;
    /**
     * The name of the license used by the library.
     */
    licenseName: string;
    /**
     * A URL to the location where the license details can be viewed.
     */
    licenseUrl: string;
    private constructor();
    private static parseComponents;
    /**
     * Asynchronously get the list of licenses used by the various W.I.S.E. components.
     */
    static getLicensesPromise(): Promise<Array<License>>;
    /**
     * Get the list of licenses used by the various W.I.S.E. components.
     * @param callback A method that will be called with the results of the license lookup.
     * @param error A method that will be called if the license lookup failed.
     */
    static getLicenses(callback?: (licenses: Array<License>) => any, error?: (message: any) => any): void;
}
