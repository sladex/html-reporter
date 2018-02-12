'use strict';

const temp = require('temp');
const _ = require('lodash');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));
const Runner = require('./runner');
const ReportBuilderFactory = require('../../../report-builder-factory');
const reportSubscribe = require('./report-subscribe');
const BaseToolRunner = require('../tool-runner');

temp.track();

module.exports = class GeminiReporter extends BaseToolRunner {
    static create(paths, tool, configs) {
        return new this(paths, tool, configs);
    }

    constructor(paths, tool, {program: globalOpts, pluginConfig}) {
        super(paths);

        this._globalOpts = globalOpts;
        this._pluginConfig = pluginConfig;
        const gemini = this._gemini = tool;
        this.reportBuilder = ReportBuilderFactory.create('gemini', gemini.config, pluginConfig);
        this.diffDir = temp.path('gemini-gui-diff');
        this.currentDir = temp.path('gemini-gui-curr');
        _.set(gemini.config, 'system.tempDir', this.currentDir);
    }

    initialize() {
        return this._recreateTmpDirs()
            .then(() => this._readTests())
            .then(() => this._subscribeOnEvents());
    }

    run(tests = []) {
        this._gemini.checkUnknownBrowsers(this._globalOpts.browser);

        return Runner.create(this._collection, tests)
            .run((collection) => this._gemini.test(collection, {
                reporters: ['vflat']
            }));
    }

    get browserIds() {
        return this._gemini.browserIds;
    }

    _recreateTmpDirs() {
        return Promise
            .all([
                fs.removeAsync(this.currentDir),
                fs.removeAsync(this.diffDir),
                fs.removeAsync(this._pluginConfig.path)
            ])
            .then(() => Promise.all([
                fs.mkdirpAsync(this.currentDir),
                fs.mkdirpAsync(this.diffDir)
            ]));
    }

    _readTests() {
        const {grep, set, browser} = this._globalOpts;
        return this._gemini.readTests(this._testFiles, {grep, sets: set})
            .then((collection) => {
                this._collection = collection;
                const suites = this._collection.topLevelSuites();

                if (browser) {
                    suites.map((suite) => {
                        suite.browsers = _.intersection(suite.browsers, browser);
                    });
                }

                const states = getAllStates(this._collection.clone().allSuites());
                states.forEach((state) => {
                    state.state.shouldSkip(state.browserId)
                        ? this.reportBuilder.addSkipped(state)
                        : this.reportBuilder.addIdle(state);
                });
                this.tests = Object.assign(this.reportBuilder.getResult(), {gui: true});
            });
    }

    _subscribeOnEvents() {
        reportSubscribe(this._gemini, this.reportBuilder, this._eventSource);
    }
};

function getAllStates(suites) {
    return suites.reduce((acc, suite) => {
        suite.states.forEach((state) => {
            state.browsers.forEach((browserId) => {
                acc.push({
                    suite: state.suite,
                    state: _.cloneDeep(state),
                    browserId
                });
            });
        });
        return acc;
    }, []);
}
