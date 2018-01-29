'use strict';

const path = require('path');
const express = require('express');
const onExit = require('signal-exit');
const Promise = require('bluebird');
const App = require('./app');

exports.start = function(paths, config) {
    const app = new App(paths, config);
    const server = express();

    server.use(express.static(path.join(__dirname, '../static'), {index: 'gui.html'}));
    server.use('/images', express.static(path.join(process.cwd(), config.pluginConfig.path, 'images')));

    server.get('/', (req, res) => res.sendFile(path.join(__dirname, '../static', 'gui.html')));

    server.get('/events', function(req, res) {
        res.writeHead(200, {'Content-Type': 'text/event-stream'});

        app.addClient(res);
    });

    server.get('/init', function(req, res) {
        res.json(app.data);
    });

    server.post('/run', function(req, res) {
        app.run(req.body)
            .catch((e) => {
                console.error('Error while trying to run tests', e);
            });

        res.send({status: 'ok'});
    });

    onExit(() => {
        console.log('server shutting down');
    });

    const {options} = config;
    return app.initialize()
        .then(() => {
            return Promise.fromCallback((callback) => {
                server.listen(options.port, options.hostname, callback);
            });
        })
        .then(() => ({url: `http://${options.hostname}:${options.port}`}))
        .catch((e) => {
            console.error(e);
            process.exit(1);
        });
};
