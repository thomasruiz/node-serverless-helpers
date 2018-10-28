'use strict';

const handle = require('node-serverless-helpers').handle;

module.exports.helloWorld = handle(async (event) => {
    return 'hello lambda world!';
});

