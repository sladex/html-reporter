'use strict';

const toolAdapters = {
    'gemini': require('./gemini')
};

module.exports = {
    create: (toolName, paths, configs) => {
        return toolAdapters[toolName].create(paths, configs);
    }
};
