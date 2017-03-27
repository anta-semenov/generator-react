var finder = require('fs-finder');
var path = require('path')

function getActionTypesPath(srcPath) {
  let actionTypesPath = finder.from(srcPath).findFiles('*/actionTypes.js')
  if (Array.isArray(actionTypesPath) && actionTypesPath.length > 0) {
    return actionTypesPath[0]
  }

  actionTypesPath = finder.from(srcPath).findFiles('*/constants/actions.js')
  if (Array.isArray(actionTypesPath) && actionTypesPath.length > 0) {
    return actionTypesPath[0]
  }

  return '_actionTypes'
}

function getInSrcPathPart(srcPath, destinationPath) {
  return destinationPath.substr(srcPath.length)
}

module.exports = {
  getActionTypesPath: getActionTypesPath,
  getInSrcPathPart: getInSrcPathPart
}
