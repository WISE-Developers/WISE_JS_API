/**
 * An example that creates and runs a job through W.I.S.E. Builder.
 */

/** ignore this comment */
import * as fs from "fs";
import { globals, client, wise, defaults, fuels } from "./index";
import { DateTime } from "luxon";

let serverConfig = new defaults.ServerConfiguration();

//initialize the connection settings for W.I.S.E. Builder
globals.SocketHelper.initialize(serverConfig.builderAddress, serverConfig.builderPort);
//turn on debug messages
globals.WISELogger.getInstance().setLogLevel(globals.WISELogLevel.DEBUG);
//set the default MQTT broker to use when listening for W.I.S.E. events
client.JobManager.setDefaults({
    host: serverConfig.mqttAddress,
    port: serverConfig.mqttPort,
    topic: serverConfig.mqttTopic,
    username: serverConfig.mqttUsername,
    password: serverConfig.mqttPassword
});
//uncomment this line for exceptions to be thrown when invalid values are set
//globals.SocketMsg.inlineThrowOnError = true;
//the directory of the test files
let localDir = serverConfig.exampleDirectory;

//make sure the local directory has been configured
if (localDir.includes('@JOBS@')) {
    console.log("The job directory has not been configured. Please edit the job directory before running the example server.");
    process.exit();
}

/**
 * Async 
 * @param t The timeout in milliseconds
 * @param callback The function that will be called when the delay is up.
 */
function delay(t: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve()
        }, t)
    });
}

/**
 * Recursively handle nodes of the validation tree and
 * print relevant ones to the console.
 * @param node The node of the validation tree to handle.
 */
function handleErrorNode(node: globals.ValidationError) {
    //leaf node
    if (node.children.length == 0) {
        console.error(`'${node.getValue()}' is invalid for '${node.propertyName}': "${node.message}"`);
    }
    //branch node
    else {
        node.children.forEach(child => {
            handleErrorNode(child);
        });
    }
}

function buildDogribLUT(): Array<fuels.FuelDefinition> {
    const fuelDefinitions = new Array<fuels.FuelDefinition>();
    let fuel = new fuels.FuelDefinition("C-1 Spruce-Lichen Woodland", "C-1", 1);
    fuel.color = new fuels.RGBColor({ red: 209, green: 255, blue: 115 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("C-2 Boreal Spruce", "C-2", 2);
    fuel.color = new fuels.RGBColor({ red: 34, green: 102, blue: 51 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("C-3 Mature Jack or Lodgepole Pine", "C-3", 3);
    fuel.color = new fuels.RGBColor({ red: 131, green: 199, blue: 149 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("C-4 Immature Jack or Lodgepole Pine", "C-4", 4);
    fuel.color = new fuels.RGBColor({ red: 112, green: 168, blue: 0 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("C-5 Red and White Pine", "C-5", 5);
    fuel.color = new fuels.RGBColor({ red: 223, green: 184, blue: 230 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("C-6 Conifer Plantation", "C-6", 6);
    fuel.color = new fuels.RGBColor({ red: 172, green: 102, blue: 237 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("C-7 Ponderosa Pine - Douglas-Fir", "C-7", 7);
    fuel.color = new fuels.RGBColor({ red: 112, green: 12, blue: 242 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("D-1 Leafless Aspen", "D-1", 11);
    fuel.color = new fuels.RGBColor({ red: 196, green: 189, blue: 151 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("D-2 Green Aspen (with BUI Thresholding)", "D-2", 12);
    fuel.color = new fuels.RGBColor({ red: 137, green: 112, blue: 68 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("D-1/D-2 Aspen", "D-1/D-2", 13);
    fuel.color = new fuels.RGBColor({ red: 196, green: 189, blue: 151 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("S-1 Jack or Lodgepole Pine Slash", "S-1", 21);
    fuel.color = new fuels.RGBColor({ red: 251, green: 190, blue: 185 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("S-2 White Spruce - Balsam Slash", "S-2", 22);
    fuel.color = new fuels.RGBColor({ red: 247, green: 104, blue: 161 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("S-3 Coastal Cedar - Hemlock - Douglas-Fir Slash", "S-3", 23);
    fuel.color = new fuels.RGBColor({ red: 174, green: 1, blue: 126 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("O-1a Matted Grass", "O-1a", 31);
    fuel.color = new fuels.RGBColor({ red: 255, green: 255, blue: 190 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("O-1b Standing Grass", "O-1b", 32);
    fuel.color = new fuels.RGBColor({ red: 230, green: 230, blue: 0 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless", "M-1", 40);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (05% Conifer)", "M-1", 405);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 5 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (10% Conifer)", "M-1", 410);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 10 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (15% Conifer)", "M-1", 415);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 15 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (20% Conifer)", "M-1", 420);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 20 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (25% Conifer)", "M-1", 425);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 25 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (30% Conifer)", "M-1", 430);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 30 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (35% Conifer)", "M-1", 435);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 35 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (40% Conifer)", "M-1", 440);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 40 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (45% Conifer)", "M-1", 445);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 45 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (50% Conifer)", "M-1", 450);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 50 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (55% Conifer)", "M-1", 455);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 55 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (60% Conifer)", "M-1", 460);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 60 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (65% Conifer)", "M-1", 465);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 65 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (70% Conifer)", "M-1", 470);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 70 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (75% Conifer)", "M-1", 475);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 75 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (80% Conifer)", "M-1", 480);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 80 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (85% Conifer)", "M-1", 485);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 85 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (90% Conifer)", "M-1", 490);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 90 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1 Boreal Mixedwood - Leafless (95% Conifer)", "M-1", 495);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 95 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green", "M-2", 50);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (05% Conifer)", "M-2", 505);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 5 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (10% Conifer)", "M-2", 510);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 10 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (15% Conifer)", "M-2", 515);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 15 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (20% Conifer)", "M-2", 520);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 20 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (25% Conifer)", "M-2", 525);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 25 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (30% Conifer)", "M-2", 530);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 30 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (35% Conifer)", "M-2", 535);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 35 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (40% Conifer)", "M-2", 540);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 40 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (45% Conifer)", "M-2", 545);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 45 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (50% Conifer)", "M-2", 550);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 50 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (55% Conifer)", "M-2", 555);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 55 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (60% Conifer)", "M-2", 560);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 60 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (65% Conifer)", "M-2", 565);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 65 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (70% Conifer)", "M-2", 570);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 70 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (75% Conifer)", "M-2", 575);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 75 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (80% Conifer)", "M-2", 580);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 80 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (85% Conifer)", "M-2", 585);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 85 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (90% Conifer)", "M-2", 590);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 90 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-2 Boreal Mixedwood - Green (95% Conifer)", "M-2", 595);
    fuel.color = new fuels.RGBColor({ red: 255, green: 170, blue: 0 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 95 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood", "M-1/M-2", 60);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (05% Conifer)", "M-1/M-2", 605);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 5 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (10% Conifer)", "M-1/M-2", 610);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 10 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (15% Conifer)", "M-1/M-2", 615);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 15 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (20% Conifer)", "M-1/M-2", 620);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 20 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (25% Conifer)", "M-1/M-2", 625);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 25 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (30% Conifer)", "M-1/M-2", 630);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 30 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (35% Conifer)", "M-1/M-2", 635);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 35 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (40% Conifer)", "M-1/M-2", 640);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 40 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (45% Conifer)", "M-1/M-2", 645);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 45 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (50% Conifer)", "M-1/M-2", 650);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 50 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (55% Conifer)", "M-1/M-2", 655);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 55 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (60% Conifer)", "M-1/M-2", 660);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 60 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (65% Conifer)", "M-1/M-2", 665);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 65 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (70% Conifer)", "M-1/M-2", 670);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 70 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (75% Conifer)", "M-1/M-2", 675);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 75 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (80% Conifer)", "M-1/M-2", 680);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 80 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (85% Conifer)", "M-1/M-2", 685);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 85 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (90% Conifer)", "M-1/M-2", 690);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 90 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-1/M-2 Boreal Mixedwood (95% Conifer)", "M-1/M-2", 695);
    fuel.color = new fuels.RGBColor({ red: 255, green: 211, blue: 127 });
    fuel.spreadParms = new fuels.MixedSpread({ pc: 95 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless", "M-3", 70);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (05% Dead Fir)", "M-3", 705);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 5 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (10% Dead Fir)", "M-3", 710);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 10 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (15% Dead Fir)", "M-3", 715);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 15 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (20% Dead Fir)", "M-3", 720);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 20 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (25% Dead Fir)", "M-3", 725);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 25 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (30% Dead Fir)", "M-3", 730);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 30 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (35% Dead Fir)", "M-3", 735);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 35 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (40% Dead Fir)", "M-3", 740);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 40 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (45% Dead Fir)", "M-3", 745);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 45 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (50% Dead Fir)", "M-3", 750);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 50 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (55% Dead Fir)", "M-3", 755);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 55 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (60% Dead Fir)", "M-3", 760);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 60 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (65% Dead Fir)", "M-3", 765);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 65 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (70% Dead Fir)", "M-3", 770);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 70 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (75% Dead Fir)", "M-3", 775);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 75 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (80% Dead Fir)", "M-3", 780);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 80 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (85% Dead Fir)", "M-3", 785);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 85 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (90% Dead Fir)", "M-3", 790);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 90 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3 Dead Balsam Fir Mixedwood - Leafless (95% Dead Fir)", "M-3", 795);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 95 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green", "M-4", 80);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (05% Dead Fir)", "M-4", 805);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 5 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (10% Dead Fir)", "M-4", 810);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 10 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (15% Dead Fir)", "M-4", 815);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 15 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (20% Dead Fir)", "M-4", 820);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 20 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (25% Dead Fir)", "M-4", 825);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 25 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (30% Dead Fir)", "M-4", 830);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 30 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (35% Dead Fir)", "M-4", 835);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 35 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (40% Dead Fir)", "M-4", 840);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 40 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (45% Dead Fir)", "M-4", 845);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 45 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (50% Dead Fir)", "M-4", 850);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 50 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (55% Dead Fir)", "M-4", 855);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 55 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (60% Dead Fir)", "M-4", 860);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 60 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (65% Dead Fir)", "M-4", 865);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 65 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (70% Dead Fir)", "M-4", 870);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 70 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (75% Dead Fir)", "M-4", 875);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 75 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (80% Dead Fir)", "M-4", 880);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 80 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (85% Dead Fir)", "M-4", 885);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 85 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (90% Dead Fir)", "M-4", 890);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 90 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-4 Dead Balsam Fir Mixedwood - Green (95% Dead Fir)", "M-4", 895);
    fuel.color = new fuels.RGBColor({ red: 170, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 95 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood", "M-3/M-4", 90);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (05% Dead Fir)", "M-3/M-4", 905);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 5 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (10% Dead Fir)", "M-3/M-4", 910);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 10 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (15% Dead Fir)", "M-3/M-4", 915);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 15 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (20% Dead Fir)", "M-3/M-4", 920);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 20 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (25% Dead Fir)", "M-3/M-4", 925);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 25 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (30% Dead Fir)", "M-3/M-4", 930);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 30 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (35% Dead Fir)", "M-3/M-4", 935);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 35 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (40% Dead Fir)", "M-3/M-4", 940);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 40 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (45% Dead Fir)", "M-3/M-4", 945);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 45 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (50% Dead Fir)", "M-3/M-4", 950);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 50 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (55% Dead Fir)", "M-3/M-4", 955);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 55 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (60% Dead Fir)", "M-3/M-4", 960);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 60 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (65% Dead Fir)", "M-3/M-4", 965);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 65 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (70% Dead Fir)", "M-3/M-4", 970);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 70 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (75% Dead Fir)", "M-3/M-4", 975);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 75 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (80% Dead Fir)", "M-3/M-4", 980);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 80 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (85% Dead Fir)", "M-3/M-4", 985);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 85 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (90% Dead Fir)", "M-3/M-4", 990);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 90 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("M-3/M-4 Dead Balsam Fir Mixedwood (95% Dead Fir)", "M-3/M-4", 995);
    fuel.color = new fuels.RGBColor({ red: 99, green: 0, blue: 0 });
    fuel.spreadParms = new fuels.MixedDeadSpread({ pdf: 95 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("Not Available", "Non-Fuel", 100);
    fuel.color = new fuels.RGBColor({ red: 255, green: 255, blue: 255 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("Non-fuel", "Non-Fuel", 101);
    fuel.color = new fuels.RGBColor({ red: 130, green: 130, blue: 130 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("Water", "Non-Fuel", 102);
    fuel.color = new fuels.RGBColor({ red: 115, green: 223, blue: 255 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("Unknown", "Non-Fuel", 103);
    fuel.color = new fuels.RGBColor({ red: 0, green: 0, blue: 0 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("Unclassified", "Non-Fuel", 104);
    fuel.color = new fuels.RGBColor({ red: 166, green: 166, blue: 166 });
    fuelDefinitions.push(fuel);
    fuel = new fuels.FuelDefinition("Vegetated Non-Fuel", "Non-Fuel", 105);
    fuel.color = new fuels.RGBColor({ red: 204, green: 204, blue: 204 });
    fuelDefinitions.push(fuel);

    return fuelDefinitions;
}

//an asynchronous function for creating a job and listening for status messages.
(async function() {
    //fetch the default settings for some parameters from W.I.S.E. Builder
    let jDefaults = await new defaults.JobDefaults().getDefaultsPromise();

    globals.WISELogger.getInstance().info('Building W.I.S.E. job.');
    //set this to the location of the test files folder.
    let prom = new wise.WISE();
    //add the projection and elevation files as attachments
    let projContents = fs.readFileSync(localDir + '/test/elevation.prj');
    let elevContents = fs.readFileSync(localDir + '/test/elevation.asc');
    let projAttachment = prom.addAttachment('elevation.prj', projContents);
    let elevAttachment = prom.addAttachment('elevation.asc', elevContents);
    if (!projAttachment || !elevAttachment) {
        throw Error("Cannot add attachment");
    }
    prom.setProjectionFile('' + projAttachment);
    prom.setElevationFile('' + elevAttachment);
    //add the rest of the files as paths to locations on disk
    prom.setFuelmapFile(localDir + '/test/fbp_fuel_type.asc');


    prom.setLutFile(localDir + '/test/fbp_lookup_table.lut');
    //prom.setLutDefinition(buildDogribLUT());


    prom.setTimezoneByValue(25); //hard coded to CDT, see example_timezone.js for an example getting the IDs
    let degree_curing = prom.addGridFile(localDir + '/test/degree_of_curing.asc',
        localDir + '/test/degree_of_curing.prj', wise.GridFileType.DEGREE_CURING);
    let fuel_patch = prom.addLandscapeFuelPatch("O-1a Matted Grass", "O-1b Standing Grass");
    let gravel_road = prom.addFileFuelBreak(localDir + '/test/access_gravel_road.kmz');
    gravel_road.width = 10.0;
    gravel_road.setName("Gravel Road");
    let unimproved_road = prom.addFileFuelBreak(localDir + '/test/access_unimproved_road.kmz');
    unimproved_road.width = 10.0;
    unimproved_road.setName("Unimproved Road");
    let river = prom.addFileFuelBreak(localDir + '/test/hydrology_river.kmz');
    river.width = 25.0;
    river.setName("Rivers");
    let stream = prom.addFileFuelBreak(localDir + '/test/hydrology_stream.kmz');
    stream.width = 20.0;
    stream.setName("Streams");
    let ws = prom.addWeatherStation(1483.0, new globals.LatLon(51.654700, -115.361700));
    let b3Yaha = ws.addWeatherStream(localDir + '/test/weather_B3_hourly_Sep25toOct30_2001.txt', 94.0, 17,
        wise.HFFMCMethod.LAWSON, 89.0, 58.0, 482.0, 0.0, DateTime.fromISO("2001-09-25"), DateTime.fromISO("2001-10-30"));
    let wpatch = prom.addLandscapeWeatherPatch(DateTime.fromISO("2001-10-16T13:00:00-05:00"), globals.Duration.createTime(13, 0, 0, false),
        DateTime.fromISO("2001-10-16T21:00:00-05:00"), globals.Duration.createTime(21, 0, 0, false));
    wpatch.setWindDirOperation(wise.WeatherPatchOperation.PLUS, 10);
    wpatch.setRhOperation(wise.WeatherPatchOperation.PLUS, 5);
    let wpatch2 = prom.addFileWeatherPatch(localDir + '/test/weather_patch_wd270.kmz', DateTime.fromISO("2001-10-16T13:00:00-05:00"),
        globals.Duration.createTime(13, 0, 0, false), DateTime.fromISO("2001-10-16T21:00:00-05:00"), globals.Duration.createTime(21, 0, 0, false));
    wpatch2.setWindDirOperation(wise.WeatherPatchOperation.EQUAL, 270);
    //create the ignition points
    let ll1 = new globals.LatLon(51.65287648142513, -115.4779078053444);
    let ig3 = prom.addPointIgnition(ll1, DateTime.fromISO('2001-10-16T13:00:00-05:00'));
    let ll2 = new globals.LatLon(51.66090499909746, -115.4086430000001);
    let ig4 = prom.addPointIgnition(ll2, DateTime.fromISO('2001-10-16T16:00:00-05:00'));

    //emit some statistics at the end of timesteps
    prom.timestepSettings.addStatistic(globals.GlobalStatistics.TOTAL_BURN_AREA);
    prom.timestepSettings.addStatistic(globals.GlobalStatistics.DATE_TIME);
    prom.timestepSettings.addStatistic(globals.GlobalStatistics.SCENARIO_NAME);

    //create a scenario
    let scen1 = prom.addScenario(DateTime.fromISO('2001-10-16T13:00:00-05:00'), DateTime.fromISO('2001-10-16T22:00:00-05:00'));
    scen1.setName('scen0');
    scen1.addBurningCondition(DateTime.fromISO('2001-10-16'), 0, 24, 19, 0.0, 95.0, 0.0);
    scen1.setFgmOptions(globals.Duration.createTime(0, 2, 0, false), 1.0, 1.0, 1.0,
            false, true, true, true, false, true, 50.0);
    //optionally set dx, dy, and dt
    scen1.setProbabilisticValues(1.0, 1.0, globals.Duration.createTime(0, 0, 10, false));
    scen1.setFbpOptions(true, true);
    scen1.setFmcOptions(-1, 0.0, true, false);
    scen1.setFwiOptions(false, true, false, false, false);
    scen1.addIgnitionReference(ig3);
    scen1.addIgnitionReference(ig4);
    scen1.addWeatherStreamReference(b3Yaha);
    scen1.addFuelPatchReference(fuel_patch, 0);
    scen1.addGridFileReference(degree_curing, 1);
    scen1.addWeatherPatchReference(wpatch, 3);
    scen1.addWeatherPatchReference(wpatch2, 2);

    let ovf1 = prom.addOutputVectorFileToScenario(wise.VectorFileType.KML, 'scen0/perim.kml', DateTime.fromISO('2001-10-16T13:00:00-05:00'), DateTime.fromISO('2001-10-16T22:00:00-05:00'), scen1);
    ovf1.mergeContact = true;
    ovf1.multPerim = true;
    ovf1.removeIslands = true;
    ovf1.metadata = jDefaults.metadataDefaults;

    let ogf1 = prom.addOutputGridFileToScenario(globals.GlobalStatistics.TEMPERATURE, 'scen0/temp.txt',
        DateTime.fromISO('2001-10-16T21:00:00-05:00'), wise.Output_GridFileInterpolation.IDW, scen1);
    let ogf2 = prom.addOutputGridFileToScenario(globals.GlobalStatistics.BURN_GRID, "scen0/burn_grid.tif",
        DateTime.fromISO('2001-10-16T22:00:00-05:00'), wise.Output_GridFileInterpolation.IDW, scen1);
    let ogf3 = prom.addOutputGridFileToScenario(globals.GlobalStatistics.TOTAL_FUEL_CONSUMED, 'scen0/total_fuel_consumed.tif',
        new globals.TimeRange(DateTime.fromISO('2001-10-16T14:00:00-05:00'), DateTime.fromISO('2001-10-16T21:00:00-05:00')),
        wise.Output_GridFileInterpolation.DISCRETIZED, scen1);
    ogf3.discretize = 1;
    //allow the file to be streamed to a remote location after it is written (ex. streamOutputToMqtt, streamOutputToGeoServer).
    ogf2.shouldStream = true;

    let osf1 = prom.addOutputSummaryFileToScenario(scen1, 'scen0/summary.txt');
    osf1.outputs.outputApplication = true;
    osf1.outputs.outputFBP = true;
    osf1.outputs.outputFBPPatches = true;
    osf1.outputs.outputGeoData = true;
    osf1.outputs.outputIgnitions = true;
    osf1.outputs.outputInputs = true;
    osf1.outputs.outputLandscape = true;
    osf1.outputs.outputScenario = true;
    osf1.outputs.outputScenarioComments = true;
    osf1.outputs.outputWxPatches = true;
    osf1.outputs.outputWxStreams = true;

    //test to see if all required parameters have been set
    let errors = prom.checkValid();
    if (errors.length > 0) {
        //write the errors to the console
        errors.forEach(node => {
            handleErrorNode(node);
        });
    }
    else {
        let wrapper: wise.StartJobWrapper = null;
        //assume we will always have a backend that is capable of using validation now as the versioning is no longer compabible with semver
        wrapper = await prom.validateJobPromise();
        if (serverConfig.mqttUsername) {
            //trim the name of the newly started job
            let jobName = wrapper.name.replace(/^\s+|\s+$/g, '');
            //a manager for listening for status messages
            let manager = new client.JobManager(jobName);
            //start the job manager
            await manager.start();
            //if possible the job will first be validated, catch the validation response
            manager.on('validationReceived', (args) => {
                //the FGM could not be validated. It's possible that the W.I.S.E. version used doesn't support validation
                if (!args.validation.success) {
                    //this probably means that the W.I.S.E. Manager and W.I.S.E. versions are different, the job may be able to be started without validation
                    //at this point in time but we'll just exit and consider this an unexpected setup
                    args.manager.dispose();//close the connection that is listening for status updates
                    console.log("Validation could not be run, check your W.I.S.E. version");
                }
                //errors were found in the FGM
                else if (!args.validation.valid) {
                    args.manager.dispose();//close the connection that is listening for status updates
                    console.log("The submitted FGM is not valid");
                    //just dump the error list, let the user sort through it
                    console.log(args.validation.error_list);
                }
                //the FGM is valid, start it running
                else {
                    console.log("FGM valid, starting job");
                    //add a delay, shouldn't be needed but it's here so the user can see the process happening
                    delay(1000)
                        .then(() => {
                            //use rerun to start the job. Rerun can be used on any job that is in
                            //the finished job list in W.I.S.E. Manager.
                            args.manager.broadcastJobRerun(jobName);
                        });
                }
            });
            //when the W.I.S.E. job triggers that it is complete, shut down the listener
            manager.on('simulationComplete', (args) => {
                args.manager.dispose();//close the connection that is listening for status updates
                if (args.hasOwnProperty("time") && args.time != null) {
                console.log(`Simulation complete at ${args.time.toISOString()}.`);
                }
                else {
                    console.log("Simulation complete.");
                }
            });
            //catch scenario failure
            manager.on('scenarioComplete', (args) => {
                if (!args.success) {
                    if (args.hasOwnProperty("time") && args.time != null) {
                    console.log(`At ${args.time.toISOString()} a scenario failed: ${args.errorMessage}`);
                    }
                    else {
                        console.log(`A scenario failed: ${args.errorMessage}`);
                    }
                }
            });
            //listen for statistics at the end of timesteps
            manager.on('statisticsReceived', (args) => {
                if (args.hasOwnProperty("time") && args.time != null) {
                console.log(`Received statistics at ${args.time.toISOString()}`);
                for (const stat of args.statistics) {
                    console.log("    Statistic " + stat.key + " with value " + stat.value);
                }
                }
                else {
                    for (const stat of args.statistics) {
                        console.log("Received statistic " + stat.key + " with value " + stat.value);
                    }
                }
            });
        }
    }
})().then(x => console.log("Job created, waiting for results."));
