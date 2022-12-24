"use strict";
/**
 * An example of calculating solar times.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/** ignore this comment */
const index_1 = require("./index");
let serverConfig = new index_1.defaults.ServerConfiguration();
//initialize the connection settings for W.I.S.E. Builder
index_1.globals.SocketHelper.initialize(serverConfig.builderAddress, serverConfig.builderPort);
(async () => {
    let solarCalculator = new index_1.solar.SolarCalculator();
    solarCalculator.latitude = 49.78;
    solarCalculator.longitude = -97.15;
    solarCalculator.timezone = 25; //hard coded to CDT, see example_timezone.js for an example getting the IDs
    let date = new Date(); //get the current date
    solarCalculator.year = date.getFullYear();
    solarCalculator.month = date.getMonth() + 1;
    solarCalculator.day = date.getDate();
    await solarCalculator.fetchSolarPromise();
    console.log(`Solar times for (${solarCalculator.latitude}, ${solarCalculator.longitude}) on ${date.toLocaleDateString()}`);
    console.log(`    Sunrise:    ${solarCalculator.sunrise}`);
    console.log(`    Solar Noon: ${solarCalculator.noon}`);
    console.log(`    Sunset:     ${solarCalculator.sunset}`);
})();
//# sourceMappingURL=example_solar.js.map