"use strict";
/**
 * Use W.I.S.E. Builder to calculate solar times
 * based on the input location and date. Solar times
 * include sunrise, sunset, and solar noon.
 *
 * Example
 * -------
 *
 * ```javascript
 * let calculator = new SolarCalculator();
 * calculator.latitude = 49.8998;
 * calculator.longitude = -97.1375;
 * calculator.timezone = 15; //index was retrieved from the Timezone class in wiseGlobals.js
 * calculator.year = 2019;
 * calculator.month = 1;
 * calculator.day = 1;
 * await calculator.fetchSolarPromise();
 * //********* calculator will now contain the calulated solar values ***********
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolarCalculator = void 0;
/** ignore this comment */
const net = require("net");
const wiseGlobals_1 = require("./wiseGlobals");
class SolarCalculator extends wiseGlobals_1.IWISESerializable {
    /**
     * Get the sunrise, sunset and solar noon.
     */
    fetchSolar(callback) {
        if (this.fetchState < 0) {
            throw new Error("Multiple concurrent reqeusts");
        }
        this.fetchSolarInternal(callback);
    }
    /**
     * Get the sunrise, sunset and solar noon.
       * @returns The current {@link SolarCalculator} object with the results
     *          of the solar calculation populated.
       * @throws This method can only be called once at a time per instance.
     */
    async fetchSolarPromise() {
        if (this.fetchState < 0) {
            throw new Error("Multiple concurrent reqeusts");
        }
        return await new Promise((resolve, reject) => {
            this.fetchSolarInternal(resolve, reject);
        })
            .catch(err => { throw err; });
    }
    /*
     * This method connects to the builder and calculates the solar times
     */
    fetchSolarInternal(callback, error) {
        let stream = this.latitude + '|' + this.longitude + '|' + Math.round(this.timezone) + '|' + Math.round(this.year) + '|' + Math.round(this.month) + '|' + Math.round(this.day);
        this.fetchState = -1;
        let builder = net.connect({ port: wiseGlobals_1.SocketHelper.getPort(), host: wiseGlobals_1.SocketHelper.getAddress() }, function () {
            wiseGlobals_1.WISELogger.getInstance().debug("connected to builder, calculating solar times !");
            builder.write(wiseGlobals_1.SocketMsg.STARTUP + wiseGlobals_1.SocketMsg.NEWLINE);
            builder.write(SolarCalculator.CALCULATE_SOLAR_KEY + wiseGlobals_1.SocketMsg.NEWLINE);
            builder.write(stream + wiseGlobals_1.SocketMsg.NEWLINE);
        });
        builder.on('data', (data) => {
            let rawDefaults = data.toString().split(new RegExp('[\\|\\r\\n]'));
            this.sunrise = rawDefaults[0];
            this.sunset = rawDefaults[1];
            this.noon = rawDefaults[2];
            builder.write(wiseGlobals_1.SocketMsg.SHUTDOWN + wiseGlobals_1.SocketMsg.NEWLINE, (err) => {
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
                callback(this);
            }
            wiseGlobals_1.WISELogger.getInstance().debug("disconnected from builder");
        });
    }
}
exports.SolarCalculator = SolarCalculator;
SolarCalculator.CALCULATE_SOLAR_KEY = "SOLAR_CALCULATOR";
//# sourceMappingURL=solar.js.map