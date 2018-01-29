'use strict';

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

        const {state, suite, browserId} = data;
        const {name} = state;
        const suitePath = suite.path.concat(state.name);
        const matcher = {name, suitePath, browserId};
        const nodeResult = suiteUtils.findNode(reportBuilder.getSuites(), suitePath);
        const browserResult = nodeResult.browsers.filter((b) => b.name === browserId)[0];

        // save image here to show diff in runtime
        client.emit(gemini.events.TEST_RESULT, Object.assign(matcher, {browserResult}));
    });

    proxy(gemini.events.SKIP_STATE);
    proxy(gemini.events.END_STATE);
    proxy(gemini.events.END_SUITE);
    proxy(gemini.events.END);

    const generateReportPromise = prepareImages(gemini, reportBuilder)
        .catch((e) => {
            console.error('Error while saving images', e);
        });

    gemini.on(gemini.events.END_RUNNER, () => generateReportPromise);
};

function prepareImages(gemini, reportBuilder) {
    const {pluginConfig} = reportBuilder;

    function handleErrorEvent(result) {
        var src = result.imagePath || result.currentPath;

        return src && utils.copyImageAsync(src, utils.getCurrentAbsolutePath(result, pluginConfig.path));
    }

    function handleTestResultEvent(testResult) {
        const actions = [
            utils.copyImageAsync(
                testResult.referencePath,
                utils.getReferenceAbsolutePath(testResult, pluginConfig.path)
            )
        ];

        if (!testResult.equal) {
            actions.push(
                utils.copyImageAsync(
                    testResult.currentPath,
                    utils.getCurrentAbsolutePath(testResult, pluginConfig.path)
                ),
                utils.saveDiff(
                    testResult,
                    utils.getDiffAbsolutePath(testResult, pluginConfig.path)
                )
            );
        }

        return Promise.all(actions);
    }

    return new Promise((resolve, reject) => {
        let queue = Promise.resolve();

        gemini.on(gemini.events.ERROR, (testResult) => {
            queue = queue.then(() => handleErrorEvent(reportBuilder.format(testResult)));
        });

        gemini.on(gemini.events.RETRY, (testResult) => {
            const wrapped = reportBuilder.format(testResult);

            queue = queue.then(() => {
                return wrapped.isEqual()
                    ? handleTestResultEvent(wrapped)
                    : handleErrorEvent(wrapped);
            });
        });

        gemini.on(gemini.events.TEST_RESULT, (testResult) => {
            queue = queue.then(() => handleTestResultEvent(reportBuilder.format(testResult)));
        });

        gemini.on(gemini.events.UPDATE_RESULT, (testResult) => {
            testResult = Object.assign(testResult, {
                referencePath: testResult.imagePath,
                equal: true
            });

            queue = queue.then(() => handleTestResultEvent(reportBuilder.format(testResult)));
        });

        gemini.on(gemini.events.END, () => queue.then(resolve, reject));
    });
}
