/**
 * An example of retrieving the known timezone values.
 */

/** ignore this comment */
import { globals, defaults } from "./index";

let serverConfig = new defaults.ServerConfiguration();

//initialize the connection settings for W.I.S.E. Builder
globals.SocketHelper.initialize(serverConfig.builderAddress, serverConfig.builderPort);

let zoneCache: globals.TimezoneName[] = null;
//get the list of supported timezones
(async() => {
    zoneCache = await globals.Timezone.getTimezoneNameListPromise();
    for (const zone of zoneCache) {
        console.log(zone.name + " has a reference Id of " + zone.value);
    }
})();