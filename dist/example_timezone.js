"use strict";
/**
 * An example of retrieving the known timezone values.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/** ignore this comment */
const index_1 = require("./index");
let serverConfig = new index_1.defaults.ServerConfiguration();
//initialize the connection settings for W.I.S.E. Builder
index_1.globals.SocketHelper.initialize(serverConfig.builderAddress, serverConfig.builderPort);
let zoneCache = null;
//get the list of supported timezones
(async () => {
    zoneCache = await index_1.globals.Timezone.getTimezoneNameListPromise();
    for (const zone of zoneCache) {
        console.log(zone.name + " has a reference Id of " + zone.value);
    }
})();
//# sourceMappingURL=example_timezone.js.map