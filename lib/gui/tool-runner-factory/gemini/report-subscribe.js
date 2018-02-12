'use strict';

const Promise = require('bluebird');
const testStatuses = require('../../../constants/test-statuses');
const utils = require('../../../../utils');
const suiteUtils = require('../../../../lib/static/modules/utils');

module.exports = (gemini, reportBuilder, client) => {
    const proxy = (event) => {
        gemini.on(event, (data) => {
            client.emit(event, data);
        });
    };

    proxy(gemini.events.BEGIN);

    gemini.on(gemini.events.BEGIN_SUITE, (data) => {
        const {name, path: suitePath} = data.suite;
        client.emit(gemini.events.BEGIN_SUITE, {
            name,
            suitePath,
            status: testStatuses.RUNNING
        });
    });

    gemini.on(gemini.events.BEGIN_STATE, (data) => {
        const {name, suite: {path: suitePath}} = data.state;
        client.emit(gemini.events.BEGIN_STATE, {
            name,
            suitePath,
            browserId: data.browserId,
            status: testStatuses.RUNNING
        });
    });

    gemini.on(gemini.events.TEST_RESULT, (data) => {
        data.equal
            ? reportBuilder.addSuccess(data)
            : reportBuilder.addFail(data);

        const {state: {name}, suite, browserId} = data;
        const suitePath = suite.path.concat(name);
        const matcher = {name, suitePath, browserId};
        const nodeResult = suiteUtils.findNode(reportBuilder.getSuites(), suitePath);
        const browserResult = nodeResult.browsers.filter((b) => b.name === browserId)[0];

        const {pluginConfig: {path: reportPath}} = reportBuilder;
        saveTestImages(reportBuilder.format(data), reportPath)
            .done(() => client.emit(gemini.events.TEST_RESULT, Object.assign(matcher, {browserResult})));
    });

    proxy(gemini.events.SKIP_STATE);
    proxy(gemini.events.END_STATE);
    proxy(gemini.events.END_SUITE);
    proxy(gemini.events.END);
};

function saveTestImages(testResult, reportPath) {
    const actions = [
        utils.copyImageAsync(
            testResult.referencePath,
            utils.getReferenceAbsolutePath(testResult, reportPath)
        )
    ];

    if (!testResult.equal) {
        actions.push(
            utils.copyImageAsync(
                testResult.currentPath,
                utils.getCurrentAbsolutePath(testResult, reportPath)
            ),
            utils.saveDiff(
                testResult,
                utils.getDiffAbsolutePath(testResult, reportPath)
            )
        );
    }

    return Promise.all(actions);
}
