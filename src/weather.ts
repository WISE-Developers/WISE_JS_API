/**
 * Fetch current weather conditions from Environment Canada for
 * a given city and province. The supported cities for each
 * province can also be retrieved.
 * 
 * Example
 * -------
 * 
 * For fetching the supported cities in Alberta:
 * 
 * ```javascript
 * let cities = await WeatherCalculator.getCitiesPromise(Province.ALBERTA);
 * ```
 * 
 * For fetching the current weather for a location:
 * 
 * ```javascript
 * let calculator = new WeatherCalculator();
 * calculator.province = "AB";
 * calculator.city = "Calgary";
 * await calculator.fetchWeatherPromise();
 * //********* the calculator will now contain current weather values ***********
 * ```
 */

/** ignore this comment */
import * as net from "net";
import { WISELogger, SocketMsg, SocketHelper, Province, IWISESerializable } from "./wiseGlobals";

/**
 * Fetch current weather information for a given city, province.
 */
export class WeatherCalculator extends IWISESerializable {
  private static readonly GET_WEATHER_KEY = "WEATHER_GET";
  
  /**
   * The province to fetch the weather for (can be either the full name or abbreviation).
   */
  public province: string;
  
  /**
   * The city to fetch the weather for. Must be one of the predefined cities for the
   * specified province.
   */
  public city: string;
  
  /**
   * The observation time for the weather conditions.
   */
  public time: string;
  
  /**
   * The current temperature (in celsius).
   */
  public temperature: number;
  
  /**
   * The current relative humidity (%).
   */
  public humidity: number;
  
  /**
   * The current wind speed (km/h).
   */
  public windSpeed: number;
  
  /**
   * The current wind direction (degrees).
   */
  public windDirection: number;
  
  /**
   * Get the current weather conditions for the specified province and city.
   */
  public fetchWeather(callback?: (defaults: WeatherCalculator) => any): void {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    this.fetchWeatherInternal(callback);
  }
  
  /**
   * Get the current weather conditions for the specified province and city.
   * @returns A {@link WeatherCalculator} object that contains the current weather
   *          conditions for the specified city and province.
   * @throws This method can only be called once at a time per instance.
   */
  public async fetchWeatherPromise(): Promise<WeatherCalculator> {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    return await new Promise<WeatherCalculator>((resolve, reject) => {
      this.fetchWeatherInternal(resolve, reject);
    })
    .catch(err => { throw err });
  }
  
  /*
   * This method connects to the builder and retrieves the weather
   */
  private fetchWeatherInternal(callback?: (defaults: WeatherCalculator) => any, error?: (message: any) => any): void {
    let stream = this.province + '|' + this.city;
    this.fetchState = -1;
    
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      WISELogger.getInstance().debug("connected to builder, getting weather !");
      builder.write(SocketMsg.STARTUP + SocketMsg.NEWLINE);
      builder.write(WeatherCalculator.GET_WEATHER_KEY + SocketMsg.NEWLINE);
      builder.write(stream + SocketMsg.NEWLINE);
    });
    builder.on('data', (data) => {
      let rawDefaults = data.toString().split(new RegExp('[\\|\\r\\n]'));
      this.province = rawDefaults[0];
      this.city = rawDefaults[1];
      this.temperature = +rawDefaults[2];
      this.time = rawDefaults[3];
      this.humidity = +rawDefaults[4];
      this.windSpeed = +rawDefaults[5];
      this.windDirection = +rawDefaults[6];
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
  
  /**
   * Get a list of supported cities in the provided province.
   */
  public static getCities(province: Province, callback?: (defaults: string[]) => any): void {
    (new CitiesGetter()).getCitiesInternal(province, callback);
  }
  
  /**
   * Get a list of supported cities in the provided province.
   * @param province The province to get the supported cities in.
   * @returns An array of city names.
   */
  public static async getCitiesPromise(province: Province): Promise<Array<string>> {
    return await new Promise<Array<string>>((resolve, reject) => {
      (new CitiesGetter()).getCitiesInternal(province, resolve, reject);
    })
    .catch(err => { throw err });
  }
}

class CitiesGetter extends IWISESerializable {
  private static readonly GET_CITIES_KEY = "WEATHER_LIST_CITIES";
  
  /*
   * This method connects to the builder and retrieves the cities
   * @returns An array of cities from the retrieval
   */
  public getCitiesInternal(province: Province, callback?: (defaults: string[]) => any, error?: (err: Error) => any): void {
    let retval = new Array<string>();
    this.fetchState = -1;
    
    let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
      WISELogger.getInstance().debug("connected to builder, getting cities !");
      builder.write(SocketMsg.STARTUP + SocketMsg.NEWLINE);
      builder.write(CitiesGetter.GET_CITIES_KEY + SocketMsg.NEWLINE);
      builder.write(province + SocketMsg.NEWLINE);
    });
    builder.on('data', (data) => {
      let rawDefaults = data.toString().split("|");
      for (let item of rawDefaults) {
        retval.push(item);
      }
      
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
        callback(retval);
      }
      WISELogger.getInstance().debug("disconnected from builder");
    });
  }
}