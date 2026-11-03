module.exports = require('./awsCredentialsSync')({
    provider: require('./awsProvider'),
    model: require('../models/awsCredentialsModel')
});
