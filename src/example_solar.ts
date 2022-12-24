/**
 * An example of calculating solar times.
 */

/** ignore this comment */
import { globals, solar, defaults } from "./index";

let serverConfig = new defaults.ServerConfiguration();

//initialize the connection settings for W.I.S.E. Builder
globals.SocketHelper.initialize(serverConfig.builderAddress, serverConfig.builderPort);

(async() => {
    let solarCalculator = new solar.SolarCalculator();
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