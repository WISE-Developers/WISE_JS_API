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

/** ignore this comment */
import * as net from "net";
import { SocketHelper, WISELogger, SocketMsg, IWISESerializable } from "./wiseGlobals";

export class SolarCalculator extends IWISESerializable {
  private static readonly CALCULATE_SOLAR_KEY: string = "SOLAR_CALCULATOR";
  
  /**
   * The latitude to calculate the sunrise/sunset for (in degrees).
   */
  public latitude: number;
  
  /**
   * The longitude to calculate the sunrise/sunset for (in degrees).
   */
  public longitude: number;
  
  /**
   * The timezone index to format the returned forecast times in. Must be from the list
   * obtained from Timezone::getTimezoneNameList().
   */
  public timezone: number;
  
  /**
   * The year to get the sunset/sunrise for. Must be after 1600.
   */
  public year: number;
  
  /**
   * The month to get the sunset/sunrise for. January - 1 to December - 12.
   */
  public month: number;
  
  /**
   * The day of the month to get the sunrise/sunset for.
   */
  public day: number;
  
  /**
   * Sunrise in the same timezone as the input.
   */
  public sunrise: string;
  
  /**
   * Sunset in the same timezone as the input.
   */
  public sunset: string;
  
  /**
   * Solar noon in the same timezone as the intput.
   */
  public noon: string;
  
  /**
   * Get the sunrise, sunset and solar noon.
   */
  public fetchSolar(callback?: (solar: SolarCalculator) => any): void {
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
  public async fetchSolarPromise(): Promise<SolarCalculator> {
    if (this.fetchState < 0) {
        throw new Error("Multiple concurrent reqeusts");
    }
    return await new Promise<SolarCalculator>((resolve, reject) => {
        this.fetchSolarInternal(resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /*
   * This method connects to the builder and calculates the solar times
   */
  private fetchSolarInternal(callback?: (solar: SolarCalculator) => any, error?: (err: Error) => any): void {
    let stream = this.latitude + '|' + this.longitude + '|' + Math.round(this.timezone) + '|' + Math.round(this.year) + '|' + Math.round(this.month) + '|' + Math.round(this.day);
    this.fetchState = -1;

    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
        WISELogger.getInstance().debug("connected to builder, calculating solar times !");
        builder.write(SocketMsg.STARTUP + SocketMsg.NEWLINE);
        builder.write(SolarCalculator.CALCULATE_SOLAR_KEY + SocketMsg.NEWLINE);
        builder.write(stream + SocketMsg.NEWLINE);
    });
    builder.on('data', (data) => {
        let rawDefaults = data.toString().split(new RegExp('[\\|\\r\\n]'));
        this.sunrise = rawDefaults[0];
        this.sunset = rawDefaults[1];
        this.noon = rawDefaults[2];
        builder.write(SocketMsg.SHUTDOWN + SocketMsg.NEWLINE, (err) => {
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
        WISELogger.getInstance().debug("disconnected from builder");
    });
  }
}