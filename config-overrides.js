const webpack = require('webpack');
module.exports = function override(config, env) {
    config.resolve.fallback = {
        url: require.resolve('url'),
        assert: require.resolve('assert'),
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        buffer: require.resolve('buffer'),
        stream: require.resolve('stream-browserify'),
    };
    config.resolve.alias = {
        'stream': 'stream-browserify',
        'buffer': 'buffer',
        'http': 'stream-http',
        'https': 'https-browserify',
        'os': 'os-browserify/browser',
        'crypto': 'crypto-browserify',
        'assert': 'assert',
        'url': 'url',
        'process': 'process/browser'
    };
    config.plugins.push(
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        }),
    );

    return config;
}