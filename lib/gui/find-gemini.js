'use strict';

const path = require('path');
const resolve = require('resolve');
const semver = require('semver');
const chalk = require('chalk');
const shell = require('shelljs');

const COMPATIBLE_GEMINI = '^5.0.0';

module.exports = function() {
    let geminiPackage;
    try {
        geminiPackage = resolve.sync('gemini/package.json', {
            basedir: process.cwd(),
            moduleDirectory: [
                path.resolve(__dirname, '../../'),
                'node_modules',
                shell.exec('npm root --global', {silent: true}).stdout.trim()
            ]
        });
    } catch (e) {
        console.error(chalk.red('Error:'), 'gemini not found');
        console.error('Local gemini installation is required to use GUI');
        console.error('Run ', chalk.cyan('npm install gemini'), 'to install gemini');
        throw e;
    }

    const version = require(geminiPackage).version;
    if (!semver.satisfies(version, COMPATIBLE_GEMINI)) {
        console.error(chalk.red('Error:'), 'installed gemini is not compatible with GUI');
        console.error('gemini version should be in range', chalk.cyan(COMPATIBLE_GEMINI));
        throw new Error('No compatible version');
    }

    const modulePath = path.dirname(geminiPackage);
    return require(path.join(modulePath, 'api'));
};
