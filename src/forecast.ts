/**
 * Request forecast information for a given city and province
 * from W.I.S.E. Builder. Forecast information is pulled from
 * Environment Canada.
 * 
 * Example
 * -------
 * 
 * ```javascript
 * //populate the calculator with some example values
 * let calculator = new ForecastCalculator();
 * calculator.province = "AB";
 * calculator.city = "Calgary";
 * calculator.model = "GEM_DETER";
 * calculator.date = "2019-01-01";
 * calculator.timezone = 13; //index retrieved from the Timezone class in wiseGlobals.js
 * calculator.time = "00Z"; //00Z for the midnight forecast, 12Z for the noon forecast
 * calculator.forecastType = "hour"; //hour for hourly forecast, day for daily forecast
 * await calculator.fetchForecastPromise();
 * //********** the calculator will now contain an array of forecasts for different hours/days. ****************
 * ```
 */

/** ignore this comment */
import * as net from "net";
import { SocketHelper, SocketMsg, WISELogger, Province, IWISESerializable } from "./wiseGlobals";


export class ForecastHour {
  /**
   * The date time string for the forecast.
   */
  public time: string;
  
  /**
   * The forecast temperature (in celsius).
   */
  public temperature: number;
  
  /**
   * The forecast relative humidity (in percent).
   */
  public relativeHumidity: number;
  
  /**
   * The forecast precipitation (in mm).
   */
  public precipitation: number;
  
  /**
   * The forecast wind speed (in km/h).
   */
  public windSpeed: number;
  
  /**
   * The forecast wind direction (in degrees).
   */
  public windDirection: number;
}

export class ForecastDay {
  /**
   * The date of the forecast
   */
  public time: string;
  
  /**
   * The days minimum temperature (in celsius).
   */
  public minTemperature: number;
  
  /**
   * The days maximum temperature (in celsius).
   */
  public maxTemperature: number;
  
  /**
   * The average relative humidity (in percent).
   */
  public relativeHumidity: number;
  
  /**
   * The total daily precipitation (in mm).
   */
  public precipitation: number;
  
  /**
   * The days minimum wind speed (in km/h).
   */
  public minWindSpeed: number;
  
  /**
   * The days maximum wind speed (in km/h).
   */
  public maxWindSpeed: number;
  
  /**
   * The days average wind direction (in degress).
   */
  public windDirection: number;
}

export class ForecastCalculator extends IWISESerializable {
  private static readonly GET_FORECAST = "FORECAST_GET";
  
  /**
   * The province to fetch the forecast for (can be either the full name or abbreviation).
   */
  public province: string;
  
  /**
   * The city to fetch the forecast for. Must be one of the predefined cities for the
   * specified province.
   */
  public city: string;
  
  /**
   * The forecast model to use. Must be one of GEM, GEM_DETER, NCEP, or CUSTOM.
   */
  public model: string;
  
  /**
   * An array of integer model IDs to use with the custom model type. Will be ignored
   * if the model type is not CUSTOM.
   */
  public modelIds: string[];
  
  /**
   * The date to fetch the forecast for. Forecasts are not available for future dates and
   * only exist approximately a month into the past.
   */
    public date: string;
  
  /**
   * The timezone index to format the returned forecast times in. Must be from the list
   * obtained from Timezone::getTimezoneNameList().
   */
  public timezone: number;
  
  /**
   * Forecasts are generated at both 00Z and 12Z. This specifies which of those times to
   * get the forecast data for. Must be one of 00Z and 12Z.
   */
  public time: string;
  
  /**
   * The percentile to use for calculating the forecast. Not valid for GEM Deterministic.
   */
  public percentile: number;
  
  /**
   * The calculated forecast values.
   */
  public results: ForecastHour[] | ForecastDay[];
  
  /**
   * The type of forecast to get (either hour or day).
   */
  public forecastType: string;
  
    public constructor() {
    super();
    this.modelIds = new Array<string>();
    this.percentile = 50;
    this.forecastType = "hour";
  }
  
  /**
   * Lookup a forecast for the currently specified location and model.
   * @param callback A method that will be called when the forecast has been received.
   * @throws This method can only be called once at a time per instance.
   */
  public fetchForecast(callback?: (forecast: ForecastCalculator) => any) {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
    this.fetchForecastInternal(callback);
  }
  
  /**
   * Lookup a forecast for the currently specified location and model.
     * @returns The current {@link ForecastCalculator} object.
     * @throws This method can only be called once at a time per instance.
   */
  public async fetchForecastPromise(): Promise<ForecastCalculator> {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
        return await new Promise<ForecastCalculator>((resolve, reject) => {
            this.fetchForecastInternal(resolve, reject);
        })
        .catch(err => { throw err });
  }
  
  /*
   * This method connects to the builder and retrieves the forecast
   * @returns An array for the daily or hourly forecast
   */
  private fetchForecastInternal(callback?: (forecast: ForecastCalculator) => any, error?: (message: any) => any) {
        this.fetchState = -1;
    let stream = this.province + '|' + this.city + '|' + this.model;
    let ids = '';
    for (let i = 0; i < this.modelIds.length; i++) {
      ids = ids + this.modelIds[i];
      if (i < (this.modelIds.length - 1))
        ids = ids + ',';
    }
    stream = stream + '|' + ids + '|' + this.date + '|' + this.timezone;
    stream = stream + '|' + this.time + '|' + this.percentile + '|' + this.forecastType;
    
    let result = '';
        
        let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
            WISELogger.getInstance().debug("connected to builder, getting forecast !");
            builder.write(SocketMsg.STARTUP + SocketMsg.NEWLINE);
            builder.write(ForecastCalculator.GET_FORECAST + SocketMsg.NEWLINE);
            builder.write(stream + SocketMsg.NEWLINE);
        });
        builder.on('data', (data) => {
      result += data.toString();
      if (result.indexOf('COMPLETE') >= 0) {
        let rawDefaults = result.split(new RegExp('[\\|\\r\\n]'));
        let index = 0;
        if (this.forecastType === "day") {
          this.results = new Array<ForecastDay>();
          while (index <= (rawDefaults.length - 8)) {
            let day = new ForecastDay();
            day.time = rawDefaults[index];
            index++;
            day.minTemperature = +rawDefaults[index];
            index++;
            day.maxTemperature = +rawDefaults[index];
            index++;
            day.relativeHumidity = +rawDefaults[index];
            index++;
            day.precipitation = +rawDefaults[index];
            index++;
            day.minWindSpeed = +rawDefaults[index];
            index++;
            day.maxWindSpeed = +rawDefaults[index];
            index++;
            day.windDirection = +rawDefaults[index];
            index++;
            this.results.push(day);
          }
        }
        else {
          this.results = new Array<ForecastHour>();
          while (index <= (rawDefaults.length - 6)) {
            let hour = new ForecastHour();
            hour.time = rawDefaults[index];
            index++;
            hour.temperature = +rawDefaults[index];
            index++;
            hour.relativeHumidity = +rawDefaults[index];
            index++;
            hour.precipitation = +rawDefaults[index];
            index++;
            hour.windSpeed = +rawDefaults[index];
            index++;
            hour.windDirection = +rawDefaults[index];
            index++;
            this.results.push(hour);
          }
        }
        builder.write(SocketMsg.SHUTDOWN + SocketMsg.NEWLINE, (err) => {
          builder.end();
        });
      }
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
   * @param province The province to get the available cities for.
   */
  public static getCities(province: Province, callback?: (forecast: string[]) => any) {
    (new CityGetter()).getCities(province, callback);
  }
  
  /**
   * Get a list of supported cities in the provided province.
   * @param province The province to get the available cities for.
     * @returns A list of supported cities for the requested province.
     * @throws This method can only be called once at a time per instance.
   */
  public static async getCitiesPromise(province: Province): Promise<string[]> {
    return await new Promise<string[]>((resolve, reject) => {
      (new CityGetter()).getCities(province, resolve, reject);
    })
        .catch(err => { throw err });
  }
}

class CityGetter extends IWISESerializable {
  private static readonly GET_CITIES_KEY = "FORECAST_LIST_CITIES";
  
  /*
   * This method connects to the builder and retrieves the forecast cities
   * @returns An array of strings containing the retrieved city names
   */
  public getCities(province: Province, callback?: (forecast: string[]) => any, error?: (message: any) => any) {
    if (this.fetchState < 0) {
      throw new Error("Multiple concurrent reqeusts");
    }
        this.fetchState = -1;
    let results: string[];

        let builder = net.connect({ port: SocketHelper.getPort(), host: SocketHelper.getAddress() }, function() {
            WISELogger.getInstance().debug("connected to builder, getting forecast cities !");
            builder.write(SocketMsg.STARTUP + SocketMsg.NEWLINE);
            builder.write(CityGetter.GET_CITIES_KEY + SocketMsg.NEWLINE);
            builder.write(province + SocketMsg.NEWLINE);
        });
        builder.on('data', (data) => {
            results = data.toString().split(new RegExp('[\\|\\r\\n]'));
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
                callback(results);
            }
            WISELogger.getInstance().debug("disconnected from builder");
        });
  }
}