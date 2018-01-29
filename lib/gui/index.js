'use strict';

const path = require('path');
const chalk = require('chalk');
const opener = require('opener');
const server = require('./server');

const collect = (newValue, array) => (array || []).concat(newValue);

module.exports = (program, pluginConfig) => {
    program
        .command('gui [paths...]')
        .allowUnknownOption()
        .description('update the changed screenshots or gather if they does not exists')
        .option('-b, --browser <browser>', 'run test only in the specified browser', collect)
        .option('-p, --port <port>', 'Port to launch server on', 8000)
        .option('--hostname <hostname>', 'Hostname to launch server on', 'localhost')
        .option('-c, --config <file>', 'Gemini config file', path.resolve, '')
        .option('-g, --grep <pattern>', 'run only suites matching the pattern', RegExp)
        .option('-s, --set <set>', 'set to run', collect)
        .option('-a, --auto-run', 'auto run immediately')
        .option('-O, --no-open', 'not to open a browser window after starting the server')
        .option('--reuse <filepath|url>', 'Filepath to gemini tests results directory OR url to tar.gz archive to reuse')
        .option('--reuse-request-timeout <number>', 'Request timeout in milliseconds', 60000)
        .action((paths, options) => {
            return runGui(paths, {options, program, pluginConfig});
        });
};

function runGui(paths, config) {
    server.start(paths, config).then((result) => {
        console.log(`GUI is running at ${chalk.cyan(result.url)}`);
        if (config.options.open) {
            opener(result.url);
        }
    }).done();
}
