/**
* This module contains the MQTT client listener classes.
* They can be used to listen for events raised by the
* W.I.S.E. process using MQTT. Event types include scenario
* completion, simulation completion, and statistics.
* 
* Example
* -------
* 
* ```javascript
* let wise = new WISE();
* //********** setup your W.I.S.E. job here **********
* //add some statistics to listen for. They will be emitted at
* //the end of each timestep for all scenariosd
* prom.timestepSettings.addStatistic(TimestepSettings.STATISTIC_SCENARIO_CURRENT_TIME);
* prom.timestepSettings.addStatistic(TimestepSettings.STATISTIC_SCENARIO_NAME);
* //start the job
* let job = await wise.beginJobPromise();
* //create a new manager to listen for events
* let manager = new JobManager(job.name.replace(/^\s+|\s+$/g, ''));
* //listen for new statistics events
* manager.on('statisticsReceived', (args) => {
*     //args will be of type StatisticsEventArgs
* });
* //listen for new scenario complete events
* manager.on('scenarioComplete', (args) => {
*     //args will be of type ScenarioCompleteEventArgs
* });
* //listen for new simulation complete events
* manager.on('simulationComplete', (args) => {
*     //args will be of type SimulationCompleteEventArgs
* });
* 
* await manager.start(); //connect to the MQTT broker
* ```
*/

/** ignore this commment */
import * as mqtt from "mqtt";
import * as os from "os";
import { EventEmitter } from "events";

/**
* 
*/
export declare interface JobManager {
  /**
  * All scenarios have completed and W.I.S.E. is shutting down. No further events should be
  * emitted after this.
  * @param event The name of the event.
  * @param listener A callback function that receives events when the simulation has completed.
  */
  on(event: 'simulationComplete', listener: (args: SimulationCompleteEventArgs) => void): this;
  
  /**
  * A single scenario within the simulation has completed.
  * @param event The name of the event.
  * @param listener A callback function that receives events when a scenario has completed.
  */
  on(event: 'scenarioComplete', listener: (args: ScenarioCompleteEventArgs) => void): this;
  
  /**
  * The running W.I.S.E. job has emitted statistics at the end of a timestep.
  * @param event The name of the event.
  * @param listener A callback function that receives events when statistics are emitted
  *                 from a running scenario.
  */
  on(event: 'statisticsReceived', listener: (args: StatisticsEventArgs) => void): this;
  
  /**
  * Validation results have been returned from W.I.S.E..
  * @param event The name of the event.
  * @param listener A callback function that receives events when validation results
  *                 have been received for an FGM.
  */
  on(event: 'validationReceived', listener: (args: ValidationEventArgs) => void): this;
}

/**
* Details received when a simulation has completed.
*/
export class SimulationCompleteEventArgs {
  
  /**
  * The job manager that raised the event.
  */
  public manager: JobManager;
  
  /**
  * The time that the message was generated at, if available.
  */
  public time: Date;
}

/**
* Details received when a scenario has completed.
*/
export class ScenarioCompleteEventArgs {
  
  /**
  * The job manager that raised the event.
  */
  public manager: JobManager;
  
  /**
  * Was the scenario successful or did it fail.
  */
  public success: boolean;
  
  /**
  * An optional error message. Will be null if the scenario completed successfully.
  */
  public errorMessage: string;
  
  /**
  * The time that the message was generated at, if available.
  */
  public time: Date;
  
  public constructor(success: boolean, message: string|null) {
    this.success = success;
    if (!this.success) {
      if (message && message.length > 0) {
        let index = message.indexOf("Error:");
        if (index >= 0) {
          this.errorMessage = message.substring(index + 6).trim();
        }
        else {
          this.errorMessage = message;
        }
      }
      else {
        this.errorMessage = "Unknown Error";
      }
    }
  }
}

/**
* A statistic emitted from a running W.I.S.E. job.
*/
export class WISEStatistic {
  
  /**
  * The name of the returned statistic.
  */
  public key: string;
  
  /**
  * The value of the statistic. The type of the statistic
  * will depend on which statistic was returned.
  */
  public value: number|string;
}

/**
* Details of statistics emitted from a running W.I.S.E. job.
*/
export class StatisticsEventArgs {
  
  /**
  * The job manager that raised the event.
  */
  public manager: JobManager;
  
  /**
  * The list of received statistics.
  */
  public statistics: Array<WISEStatistic>;
  
  /**
  * The time that the message was generated at, if available.
  */
  public time: Date;
  
  public constructor(stats: Array<WISEStatistic>) {
    this.statistics = stats;
  }
}

/**
* Details of a validation request to W.I.S.E.. If the validation
* succeeded and the FGM was valid then the job is ready to
* be run.
*/
export class ValidationEventArgs {
  
  /**
  * The job manager that raised the event.
  */
  public manager: JobManager;
  
  /**
  * The time that the message was generated at, if available.
  */
  public time: Date;
  
  /**
  * The validation details.
  */
  public validation: IJobValidation;
}

export interface IJobManagerOptions {
  
  /**
  * The address of the MQTT broker. Does not include the port.
  * If not present `127.0.0.1` will be used.
  */
  host?: string;
  
  /**
  * The port of the MQTT broker. If not present `1883` will be used.
  */
  port?: number;
  
  /**
  * The base of the MQTT topics to subscribe to. All topics used
  * within W.I.S.E. should have the same beginning topic.
  */
  topic?: string;
  
  /**
  * A client ID to use when connecting to the MQTT broker. A
  * random ID will be generated if one is not supplied. The
  * ID must be unique to the broker that the client will be
  * connecting to.
  */
  clientID?: string;
  
  /**
  * The username to use when connecting to the MQTT broker.
  * If not present no authentication will be used.
  */
  username?: string;
  
  /**
  * The password to use when connecting to the MQTT broker.
  * If not present no authentication will be used.
  */
  password?: string;
}

/**
* @hidden
*/
interface IManageOptions {
  /**
  * The management request type.
  */
  request: string;
  
  /**
  * The target of the management request (the job ID).
  */
  target: string;
  
  /**
  * If this is a job rerun, should old job data be deleted before rerunning the job.
  */
  delete_old?: boolean;
}

/**
* A class for managing listeners for events on jobs.
*/
export class JobManager extends EventEmitter {
  
  /**
  * An MQTT client connection for receiving status updates.
  */
  private client: mqtt.MqttClient | null = null;
  
  /**
  * The name of the job running in W.I.S.E..
  */
  private jobName: string;
  
  /**
  * The topic that is being used to define the cluster
  * that this client is communicating with.
  */
  private mqttTopic: string;
  
  /**
  * The ID of the current client on the MQTT broker.
  */
  private mqttId: string;
  
  /**
  * The default connection parameters to use when
  * connecting to the MQTT broker. The client ID
  * will always be ignored.
  */
  public static defaultOptions: IJobManagerOptions = { port: 1883, host: "127.0.0.1" };
  
  /**
  * The name of the job running in W.I.S.E. that this
  * object is managing messages from.
  */
  public getJobName(): string { return this.jobName; }
  
  /**
  * @hidden
  */
  private onMqttMessageReceived(topic: string, payload: Buffer) {
    let message = new MqttMessage(topic, payload);
    if (message.type === MessageType.Status) {
      this.processMqttMessage(message);
    }
    else if (message.type === MessageType.Validate) {
      this.processValidationMqttMessage(message.validation);
    }
  }
  
  /**
  * Set the default broker connection options. If no options
  * are specified when {@link JobManager#start} is called
  * these values will be used. {@link IJobManagerOptions#clientId}
  * will always be ignored as it should be unique between
  * multiple connections.
  */
  public static setDefaults(options: IJobManagerOptions) {
    if (options.port) {
      JobManager.defaultOptions.port = options.port;
    }
    if (options.host) {
      JobManager.defaultOptions.host = options.host;
    }
    if (options.username) {
      JobManager.defaultOptions.username = options.username;
    }
    if (options.password) {
      JobManager.defaultOptions.password = options.password;
    }
    if (options.topic) {
      JobManager.defaultOptions.topic = options.topic;
    }
  }
  
  public constructor(jobName: string) {
    super();
    this.jobName = jobName.replace(/^\s+|\s+$/g, '');
  }
  
  /**
  * @hidden
  */
  private fillOptions(options: IJobManagerOptions): IJobManagerOptions {
    if (!options.clientID) {
      options.clientID = "jsapi_" + Math.random().toString(16).substr(2, 8) + "-" + os.hostname();
    }
    if (!options.host) {
      options.host = JobManager.defaultOptions.host;
    }
    if (!options.port) {
      options.port = JobManager.defaultOptions.port;
    }
    if (!options.username) {
      options.username = JobManager.defaultOptions.username;
    }
    if (!options.password) {
      options.password = JobManager.defaultOptions.password;
    }
    if (!options.topic) {
      //if there is a topic set in the default options use it
      if (JobManager.defaultOptions.topic) {
        options.topic = JobManager.defaultOptions.topic;
      }
      //otherwise use wise
      else {
        options.topic = "wise";
      }
    }
    return options;
  }
  
  /**
  * Connect to the MQTT broker and start listening for messages. If the client
  * has already connected this method will do nothing.
  * @param options An optional collection of options to modify how the MQTT
  *                client connects to the broker. Options only need to be
  *                specified if they are different from the default values.
  * @example
  * let client = new JobManager("job_id");
  * client.start({
  *     host: "mqtt.hostname",
  *     port: 1883,
  *     clientId: "unique.client.id", //will be generated if not present
  *     username: "username",
  *     password: "password"
  * });
  */
  public async start(options?: IJobManagerOptions): Promise<void> {
    if (this.client === null) {
      if (options) {
        options = this.fillOptions(options);
      }
      else {
        options = this.fillOptions({});
      }
      //ignores the brokerUrl when additional options are supplied
      this.client = mqtt.connect({
        port: options.port,
        clientId: options.clientID,
        protocol: "tcp",
        username: options.username,
        password: options.password,
        host: options.host
      });
      this.mqttTopic = options.topic ?? "wise";
      this.client.on('message', (topic, payload) => { this.onMqttMessageReceived(topic, payload); });
      await new Promise<void>((resolve, reject) => {
        this.client!.on('connect', () => {
          this.mqttId = options!.clientID ?? 'test_client';
          this.client!.subscribe(options!.topic + "/+/" + this.jobName + "/status", { "qos": 2 });
          this.client!.subscribe(options!.topic + "/+/" + this.jobName + "/validate", { "qos": 2 });
          resolve();
        });
        this.client!.on('error', (err) => {
          reject(err);
        });
      })
      .catch(err => { throw err });
    }
  }
  
  /**
  * Close the MQTT connection.
  */
  public dispose(): void {
    if (this.client !== null && this.client.connected) {
      this.client.end();
      this.client = null;
    }
  }
  
  /**
  * Broadcast to all available instances of W.I.S.E. Manager that are listening
  * to rerun a job.
  * @param job The name of the job to rerun.
  */
  public async broadcastJobRerun(job: string): Promise<mqtt.Packet> {
    let options: IManageOptions = {
      request: "rerun",
      target: job,
      delete_old: true
    };
    
    return new Promise<mqtt.Packet>((resolve, reject) => {
      this.client!.publish(`${this.mqttTopic}/${this.mqttId}/manager/manage`, JSON.stringify(options), (err, result) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(result!);
        }
      });
    });
  }
  
  /**
  * Parse a message that has been received from the MQTT connection.
  * @param message The received message.
  */
  private processMqttMessage(message: MqttMessage): void {
    //something has finished
    if (message.status === "Complete") {
      //the entire simulation is complete
      if (message.message === "WISE.EXE operations") {
        let args = new SimulationCompleteEventArgs();
        args.manager = this;
        args.time = message.sentTime;
        this.emit('simulationComplete', args);
      }
      //just a single scenario is complete
      else {
        let args = new ScenarioCompleteEventArgs(true, null);
        args.manager = this;
        args.time = message.sentTime;
        this.emit('scenarioComplete', args);
      }
    }
    //the simulation failed
    else if (message.status === "Scenario Failed") {
      let args = new ScenarioCompleteEventArgs(false, message.message);
      args.manager = this;
      args.time = message.sentTime;
      this.emit('scenarioComplete', args);
    }
    //-----generic information messages-----
    else if (message.message !== null && message.message.length > 0) {
      //this is a timestep change message
      if (message.statistics != null && message.statistics.size > 0) {
        let stats = new Array<WISEStatistic>();
        
        message.statistics.forEach((value, key) => {
          let stat = new WISEStatistic();
          stat.key = key;
          stat.value = value;
          stats.push(stat);
        });
        let args = new StatisticsEventArgs(stats);
        args.manager = this;
        args.time = message.sentTime;
        this.emit('statisticsReceived', args);
      }
    }
  }
  
  /**
  * Process the results of a job validation before passing it to
  * any listening users.
  * @param message The recieved validation details.
  */
  private processValidationMqttMessage(message: IJobValidation): void {
    let args = new ValidationEventArgs();
    args.manager = this;
    args.validation = message;
    args.time = new Date();
    this.emit('validationReceived', args);
  }
}

enum MessageType {
  Unknown,
  Status,
  Checkin,
  Validate
}

/**
* Parse an MQTT message type from a string.
* @hidden
*/
function messageTypeFromString(value: string): MessageType {
  if (value.localeCompare("status", undefined, { sensitivity: 'accent' }) === 0) {
    return MessageType.Status;
  }
  else if (value.localeCompare("reportin", undefined, { sensitivity: 'accent' }) === 0) {
    return MessageType.Checkin;
  }
  else if (value.localeCompare("validate", undefined, { sensitivity: 'accent' }) === 0) {
    return MessageType.Validate;
  }
  return MessageType.Unknown;
}

/**
* A job status update message that will be sent over MQTT as JSON.
*/
interface IJobStatus {
  /**
  * The job's current status.
  */
  status: number;
  
  /**
  * The time the message was generated at.
  */
  time: string;
  
  /**
  * A generic message related to the new status.
  */
  message: string;
  
  /**
  * An optional collection of statistics.
  */
  stats: any;
}

/**
* Details of an error or warning that was found during validation.
*/
export interface IJobValidationError {
}

/**
* A message that will be sent after a job has been validated by W.I.S.E..
*/
export interface IJobValidation {
  /**
  * Was the validation successfully run. This will only be false if
  * W.I.S.E. couldn't be started or the validation couldn't even be run,
  * it doesn't indicate that the job is or isn't valid.
  */
  success: boolean;
  
  /**
  * Was the FGM valid. This will be true if the FGM is valid and
  * ready to be run, even if there were warnings. If there were
  * errors generated by the validation this will be false.
  */
  valid: boolean;
  
  /**
  * A user readable string that indicates some of the default
  * updates that have been made in W.I.S.E. that affect the
  * simulation.
  */
  load_warnings: string;
  
  /**
  * A list of errors and warnings that were found during
  * validation.
  */
  error_list: IJobValidationError[];
}

class MqttMessage {
  
  /**
  * The received time in UTC.
  */
  public timeStamp: Date;
  
  /**
  * The sent time, if supported.
  */
  public sentTime: Date;
  
  /**
  * The ID of the application that sent the message.
  */
  public from: string;
  
  /**
  * The name of the job that the message was about.
  */
  public job: string;
  
  /**
  * The reported status fo the job. Will only be set if {@link MqttMessage#type}
  * is {@link MessageType#Status}.
  */
  public status: string;
  
  /**
  * The description sent with a status message. May be absent.
  */
  public message: string;
  
  /**
  * The full MQTT topic.
  */
  public topic: string;
  
  /**
  * The stirng received in the message payload.
  */
  public payload: string;
  
  /**
  * The type of message received.
  */
  public type: MessageType;
  
  /**
  * An optional collection of statistics.
  */
  public statistics: Map<string, any>;
  
  /**
  * Validation details. 
  */
  public validation: IJobValidation;
  
  public constructor(topic: string, payload: Buffer) {
    this.timeStamp = new Date();
    this.topic = topic;
    if (payload !== null) {
      this.payload = payload.toString();
    }
    let topicParse = topic.split('/');
    if (topicParse.length > 1) {
      //found a sender ID
      this.from = topicParse[1];
      
      if (topicParse.length > 2) {
        //found a job name
        this.job = topicParse[2];
        
        if (topicParse.length > 3) {
          //found a message type
          this.type = messageTypeFromString(topicParse[3]);
          
          //this is a status message, parse the W.I.S.E. status from the payload
          if (this.type === MessageType.Status && this.payload.length > 0) {
            let json: IJobStatus = JSON.parse(this.payload);
            
            //is the recieved value a valid status message
            if (json.hasOwnProperty("message") && json.hasOwnProperty("status")) {
              this.message = json.message;
              switch (json.status) {
                case 0:
                this.status = "Submitted";
                break;
                case 1:
                this.status = "Started";
                break;
                case 2:
                this.status = "Scenario Started";
                break;
                case 3:
                this.status = "Scenario Completed";
                break;
                case 4:
                this.status = "Scenario Failed";
                break;
                case 5:
                this.status = "Complete";
                break;
                case 6:
                this.status = "Failed";
                break;
                case 7:
                this.status = "Error";
                break;
                case 8:
                this.status = "Information";
                break;
                case 9:
                this.status = "Shutdown Requested";
                break;
                default:
                this.status = "";
                break;
              }
              //if the status was a valid status look for statistics
              if (this.status.length > 0 && json.hasOwnProperty("stats")) {
                this.statistics = new Map();
                let stats = json.stats;
                
                //add all the
                for (var key in stats) {
                  if (stats.hasOwnProperty(key)) {
                    this.statistics.set(key, stats[key]);
                  }
                }
              }
            }
            
            //is the recieved value has a sent time in it
            if (json.hasOwnProperty("time")) {
              this.sentTime = new Date(json.time);
            }
          }
          //this is a validation complete message
          else if (this.type === MessageType.Validate && this.payload.length > 0) {
            this.validation = JSON.parse(this.payload);
          }
        }
      }
    }
  }
}