'use strict';

const EventSource = require('../event-source');

module.exports = class ToolRunner {
    constructor(paths) {
        this._testFiles = [].concat(paths);
        this._eventSource = new EventSource();
    }

    addClient(connection) {
        this._eventSource.addConnection(connection);
    }

    sendClientEvent(event, data) {
        this._eventSource.emit(event, data);
    }

    getTests() {
        return this.tests;
    }
};
