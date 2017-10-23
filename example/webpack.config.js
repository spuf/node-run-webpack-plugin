const path = require('path');
const NodeRunWebpackPlugin = require('../dist/NodeRunWebpackPlugin').default;

module.exports = {
  entry: path.join(__dirname, 'main.js'),
  target: 'node',
  context: __dirname,
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'index.js'
  },
  plugins: [new NodeRunWebpackPlugin()],
  stats: 'errors-only'
};
