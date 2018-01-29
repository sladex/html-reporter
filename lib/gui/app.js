'use strict';

const ToolRunnerFactory = require('./tool-runner-factory');

module.exports = class App {
    constructor(paths, configs) {
        const {program} = configs;

        this._tool = ToolRunnerFactory.create(program.name(), paths, configs);
    }

    initialize() {
        return this._tool.initialize();
    }

    run(tests = []) {
        return this._tool.run(tests);
    }

    addClient(connection) {
        this._tool.addClient(connection);
    }

    get data() {
        return this._tool.getTests();
    }
};
