This is documentation for the Node.JS version of the W.I.S.E. API.

## Main Modules

The API is split up into several modules.

### client.js

This module contains the client API needed to listen for events raised by running W.I.S.E. jobs using MQTT.

### defaults.js

This module loads default values from W.I.S.E. Builder for the few simulation parameters that have defaults.

### fbp.js

A module to run FBP calculations from W.I.S.E. Builder.

### forecast.js

Request W.I.S.E. Builder to lookup forecast information from Environment Canada. This module also provides methods to fetch the cities that support forecast lookups.

### fwi.js

A module to run FWI calculations from W.I.S.E. Builder.

### index.js

An example web server that uses all other modules. It displays a basic website with a static FWI calculation example, forms for doing FBP and solar calculations, forecast and current condition weather lookups, and a simple start W.I.S.E. job function. The start job function will display statistic results from the running job as they are emitted.

### wiseGlobals.js

Global classes needed for interacting with various parts of the W.I.S.E. network.

### wiseInterface.js

Classes needed for building and running W.I.S.E. jobs. Simulations are built and W.I.S.E. Builder is triggered to create the job for W.I.S.E. to run.

### solar.js

A module to run solar calculations (sunrise, sunset, solar noon) from W.I.S.E. Builder.

### weather.js

A module to lookup current weather conditions with W.I.S.E. Builder. The module also contains methods to lookup the cities that support current weather conditions.

## Dependencies

- replace-in-file
- readline
- luxon
- mqtt
- socket&#46;io
- protobufjs
- npm-conf
