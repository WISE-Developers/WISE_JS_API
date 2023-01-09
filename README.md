# W.I.S.E. JavaScript API #

This repository contains the W.I.S.E. API for JavaScript/NodeJS.

## API Documentation

The API documentation can be viewed at [spydmobile.bitbucket.io](https://spydmobile.bitbucket.io/psaas_js/).

## Usage

This module can be referenced from the package.json for your project. The dependency name is `WISE_JS_API`. There are multiple ways to access the module with the following being the recommended.

```json
{
    "name": "test-project",
    "dependencies": {
        "WISE_JS_API": "github:WISE-Developers/WISE_JS_API#7.2022.12-0"
    }
}
```

Additional ways to reference the module:

1) Directly using the repository URL
```
git+https://github.com/WISE-Developers/WISE_JS_API.git
```

2) Reference a specific commit instead of a tag
```
github:WISE-Developers/WISE_JS_API#073d3e95b1b0439d67eb5a431b5bbfaa4c0c8c93
```

3) Use the head revision of the repository
```
github:WISE-Developers/WISE_JS_API
```

The URI fragments shown in 2 and 3 can also be used with the direct URL to the repository shown in 1.

## Configuration

### Job Directory

The job directory can be set using [npm-config](https://docs.npmjs.com/cli-commands/config.html). The config key is `WISE_JS_API:job_directory`. If no directory is set the default will be `C:\jobs`. The config value can be set for different user levels including the current user, globally, and for the current project. The following examples set the job directory to `/user/home/foo/jobs` as an example for Linux.

- For the current user account
```console
foo@bar:~$ npm config set WISE_JS_API:job_directory /user/home/foo/jobs
```

- Globally
```console
foo@bar:~$ npm config set WISE_JS_API:job_directory /user/home/foo/jobs -g
```

- Just for the current project
```console
foo@bar:project$ npm config set WISE_JS_API:job_directory /user/home/foo/jobs --userconfig ./.npmrc
```

If you have used the old method of setting the job directory through the setup script that was run on install that directory will still be loaded by the API if no other method of setting the value has been used.

You can also specify the job directory manually at runtime when constructing a [ServerConfiguration](https://spydmobile.bitbucket.io/psaas_js/classes/_defaults_.serverconfiguration.html) object. Pass the constructor the path to the job directory.

```javascript
const wise = require("WISE_JS_API");
const defaults_1 = wise.defaults;

let serverConfig = new defaults_1.ServerConfiguration("/user/home/foo/jobs");
```

This project actively discourages forking of our repositories. 
Contributors do not use forks, they use Branches and Pull Requests. 
Please review the following before any forking or to understand our contributions paradigm.

https://github.com/WISE-Developers/Project_issues/blob/main/CONTRIBUTING.md
