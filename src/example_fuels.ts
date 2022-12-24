/**
 * An example of retrieving the supported fuel types from
 * W.I.S.E. Builder.
 */

/** ignore this comment */
import { globals, fbp, defaults } from "./index";

let serverConfig = new defaults.ServerConfiguration();

//initialize the connection settings for W.I.S.E. Builder
globals.SocketHelper.initialize(serverConfig.builderAddress, serverConfig.builderPort);

//cache the fuel type defaults
let fuelCache: fbp.FuelType[];
(async() => {
    //retrieve the fuel types and their default settings
    fuelCache = await fbp.FbpCalculations.getFuelsWithDefaultsPromise();

    for (const fuel of fuelCache) {
        console.log(`${fuel.name}: ${fuel.desc}`);
        if (fuel.defaults.useCrownBase)
            console.log(`    Crown Base Height: ${fuel.defaults.crownBase}`);
        if (fuel.defaults.useGrassCuring)
            console.log(`    Percent Curing: ${fuel.defaults.grassCuring}`);
        if (fuel.defaults.useGrassFuelLoad)
            console.log(`    Grass Fuel Load: ${fuel.defaults.grassFuelLoad}`);
        if (fuel.defaults.usePercentConifer)
            console.log(`    Percent Conifer: ${fuel.defaults.percentConifer}`);
        if (fuel.defaults.usePercentDeadFir)
            console.log(`    Percent Dead Fir: ${fuel.defaults.percentDeadFir}`);
    }
})();