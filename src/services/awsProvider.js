const { fromInstanceMetadata } = require('@aws-sdk/credential-providers');
module.exports = fromInstanceMetadata({ timeout: 2000, maxRetries: 2 });
