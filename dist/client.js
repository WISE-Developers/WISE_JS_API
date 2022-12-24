"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobManager = exports.ValidationEventArgs = exports.StatisticsEventArgs = exports.WISEStatistic = exports.ScenarioCompleteEventArgs = exports.SimulationCompleteEventArgs = void 0;
/** ignore this commment */
const mqtt = require("mqtt");
const os = require("os");
const events_1 = require("events");
/**
* Details received when a simulation has completed.
*/
class SimulationCompleteEventArgs {
}
exports.SimulationCompleteEventArgs = SimulationCompleteEventArgs;
/**
* Details received when a scenario has completed.
*/
class ScenarioCompleteEventArgs {
    constructor(success, message) {
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
exports.ScenarioCompleteEventArgs = ScenarioCompleteEventArgs;
/**
* A statistic emitted from a running W.I.S.E. job.
*/
class WISEStatistic {
}
exports.WISEStatistic = WISEStatistic;
/**
* Details of statistics emitted from a running W.I.S.E. job.
*/
class StatisticsEventArgs {
    constructor(stats) {
        this.statistics = stats;
    }
}
exports.StatisticsEventArgs = StatisticsEventArgs;
/**
* Details of a validation request to W.I.S.E.. If the validation
* succeeded and the FGM was valid then the job is ready to
* be run.
*/
class ValidationEventArgs {
}
exports.ValidationEventArgs = ValidationEventArgs;
/**
* A class for managing listeners for events on jobs.
*/
class JobManager extends events_1.EventEmitter {
    constructor(jobName) {
        super();
        /**
        * An MQTT client connection for receiving status updates.
        */
        this.client = null;
        this.jobName = jobName.replace(/^\s+|\s+$/g, '');
    }
    /**
    * The name of the job running in W.I.S.E. that this
    * object is managing messages from.
    */
    getJobName() { return this.jobName; }
    /**
    * @hidden
    */
    onMqttMessageReceived(topic, payload) {
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
    static setDefaults(options) {
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
    /**
    * @hidden
    */
    fillOptions(options) {
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
    async start(options) {
        var _a;
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
            this.mqttTopic = (_a = options.topic) !== null && _a !== void 0 ? _a : "wise";
            this.client.on('message', (topic, payload) => { this.onMqttMessageReceived(topic, payload); });
            await new Promise((resolve, reject) => {
                this.client.on('connect', () => {
                    var _a;
                    this.mqttId = (_a = options.clientID) !== null && _a !== void 0 ? _a : 'test_client';
                    this.client.subscribe(options.topic + "/+/" + this.jobName + "/status", { "qos": 2 });
                    this.client.subscribe(options.topic + "/+/" + this.jobName + "/validate", { "qos": 2 });
                    resolve();
                });
                this.client.on('error', (err) => {
                    reject(err);
                });
            })
                .catch(err => { throw err; });
        }
    }
    /**
    * Close the MQTT connection.
    */
    dispose() {
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
    async broadcastJobRerun(job) {
        let options = {
            request: "rerun",
            target: job,
            delete_old: true
        };
        return new Promise((resolve, reject) => {
            this.client.publish(`${this.mqttTopic}/${this.mqttId}/manager/manage`, JSON.stringify(options), (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    /**
    * Parse a message that has been received from the MQTT connection.
    * @param message The received message.
    */
    processMqttMessage(message) {
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
                let stats = new Array();
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
    processValidationMqttMessage(message) {
        let args = new ValidationEventArgs();
        args.manager = this;
        args.validation = message;
        args.time = new Date();
        this.emit('validationReceived', args);
    }
}
exports.JobManager = JobManager;
/**
* The default connection parameters to use when
* connecting to the MQTT broker. The client ID
* will always be ignored.
*/
JobManager.defaultOptions = { port: 1883, host: "127.0.0.1" };
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Unknown"] = 0] = "Unknown";
    MessageType[MessageType["Status"] = 1] = "Status";
    MessageType[MessageType["Checkin"] = 2] = "Checkin";
    MessageType[MessageType["Validate"] = 3] = "Validate";
})(MessageType || (MessageType = {}));
/**
* Parse an MQTT message type from a string.
* @hidden
*/
function messageTypeFromString(value) {
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
class MqttMessage {
    constructor(topic, payload) {
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
                        let json = JSON.parse(this.payload);
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
//# sourceMappingURL=client.js.map