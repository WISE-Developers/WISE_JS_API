This is documentation for the Node.JS version of the PSaaS API.

## Main Modules

The API is split up into several modules.

### client.js

This module contains the client API needed to listen for events raised by running PSaaS jobs using MQTT.

### defaults.js

This module loads default values from PSaaS Builder for the few simulation parameters that have defaults.

### fbp.js

A module to run FBP calculations from PSaaS Builder.

### forecast.js

Request PSaaS Builder to lookup forecast information from Environment Canada. This module also provides methods to fetch the cities that support forecast lookups.

### fwi.js

A module to run FWI calculations from PSaaS Builder.

### index.js

An example web server that uses all other modules. It displays a basic website with a static FWI calculation example, forms for doing FBP and solar calculations, forecast and current condition weather lookups, and a simple start PSaaS job function. The start job function will display statistic results from the running job as they are emitted.

### psaasGlobals.js

Global classes needed for interacting with various parts of the PSaaS network.

### psaasInterface.js

Classes needed for building and running PSaaS jobs. Simulations are built and PSaaS Builder is triggered to create the job for PSaaS to run.

### solar.js

A module to run solar calculations (sunrise, sunset, solar noon) from PSaaS Builder.

### weather.js

A module to lookup current weather conditions with PSaaS Builder. The module also contains methods to lookup the cities that support current weather conditions.

## Dependencies

- replace-in-file
- readline
- luxon
- mqtt
- socket&#46;io
- protobufjs
- npm-conf

## Installation Details

Package installation and usage can be found in the repository on [Bitbucket](https://bitbucket.org/psaasredapp/psaas-js-api).
