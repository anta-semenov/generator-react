var path = require('path')

module.exports = {
  '_styleVariables.less': path.resolve('./src/constants/styleVariables.less'),
  '_reducer': path.resolve('./src/reducer'),
  '_actions': path.resolve('./src/actions'),
  '_actionTypes': path.resolve('./src/constants/actionTypes.js')
}
