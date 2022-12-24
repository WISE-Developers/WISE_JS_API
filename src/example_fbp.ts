/**
 * An example of calculating FBP values.
 */

/** ignore this comment */
import { globals, fbp, defaults } from "./index";
import { DateTime } from "luxon";

let serverConfig = new defaults.ServerConfiguration();

//initialize the connection settings for W.I.S.E. Builder
globals.SocketHelper.initialize(serverConfig.builderAddress, serverConfig.builderPort);

//an example FBP calculation
(async() => {
    //populate some example values to calculate FBP with
    let fbpCalculator = new fbp.FbpCalculations();
    fbpCalculator.fuelType = "C-1";
    fbpCalculator.elevation = 4682;
    fbpCalculator.useSlope = true;
    fbpCalculator.slopeValue = 26;
    fbpCalculator.aspect = 180;
    fbpCalculator.useLine = false;
    fbpCalculator.startTime = DateTime.local(2020, 6, 15, 12, 0, 0, 0).toISO();
    fbpCalculator.elapsedTime = 20;
    fbpCalculator.ffmc = 85.0;
    fbpCalculator.bui = 39.3;
    fbpCalculator.useBui = true;
    fbpCalculator.windSpeed = 18; //km/h
    fbpCalculator.windDirection = 165;
    fbpCalculator.latitude = 49.78;
    fbpCalculator.longitude = -97.15;
    await fbpCalculator.calculatePromise();
    console.log(`Example FBP Calculation`);
    console.log(`Input values:`);
    console.log(`    Fuel Type:        ${fbpCalculator.fuelType}`);
    console.log(`    Elevation:        ${fbpCalculator.elevation}m`);
    console.log(`    Slope:            ${fbpCalculator.slopeValue}`);
    console.log(`    Aspect:           ${fbpCalculator.aspect}`);
    console.log(`    Line ignition:    ${fbpCalculator.useLine}`);
    console.log(`    Start time:       ${fbpCalculator.startTime}`);
    console.log(`    Elapsed time:     ${fbpCalculator.elapsedTime}min`);
    console.log(`    FFMC:             ${fbpCalculator.ffmc}`);
    console.log(`    BUI:              ${fbpCalculator.bui}`);
    console.log(`    Wind speed:       ${fbpCalculator.windSpeed}km/h`);
    console.log(`    Wind Direction:   ${fbpCalculator.windDirection}\xb0`);
    console.log(`    Location:         (${fbpCalculator.latitude}, ${fbpCalculator.longitude})`);
    console.log(`Output values:`);
    console.log(`    WSV:              ${fbpCalculator.wsv}`);
    console.log(`    RAZ:              ${fbpCalculator.raz}`);
    console.log(`    ISI:              ${fbpCalculator.isi}`);
    console.log(`    FMC:              ${fbpCalculator.fmc}`);
    console.log(`    ROS_t:            ${fbpCalculator.ros_t}`);
    console.log(`    ROS_eq:           ${fbpCalculator.ros_eq}`);
    console.log(`    HFI:              ${fbpCalculator.hfi}`);
    console.log(`    CFB:              ${fbpCalculator.cfb}`);
    console.log(`    SFC:              ${fbpCalculator.sfc}`);
    console.log(`    CFC:              ${fbpCalculator.cfc}`);
    console.log(`    TFC:              ${fbpCalculator.tfc}`);
    console.log(`    Fire Description: ${fbpCalculator.fireDescription.replace(/\r\n|\n/g, "\n                      ")}`);
    console.log(`    RSO:              ${fbpCalculator.rso}`);
    console.log(`    FROS:             ${fbpCalculator.fros}`);
    console.log(`    BROS:             ${fbpCalculator.bros}`);
    console.log(`    CSI:              ${fbpCalculator.csi}`);
    console.log(`    FFI:              ${fbpCalculator.ffi}`);
    console.log(`    BFI:              ${fbpCalculator.bfi}`);
    console.log(`    Distance (head):  ${fbpCalculator.distanceHead}`);
    console.log(`    Distance (flank): ${fbpCalculator.distanceFlank}`);
    console.log(`    Distance (back):  ${fbpCalculator.distanceBack}`);
    console.log(`    LB:               ${fbpCalculator.lb}`);
    console.log(`    Area:             ${fbpCalculator.area}`);
    console.log(`    Perimeter:        ${fbpCalculator.perimeter}`);
})();