var finder = require('fs-finder')
var path = require('path')

function getImportPath(resolvingPathMode, destPath, importPath, componentName) {
  if (resolvingPathMode === 'relative') {
    const result = path.relative(destPath, importPath)
    if (!result.startsWith('.')) {
      return `./${result}`
    }
    return result
  }
  return `_${componentName}`
}

function getActionsPath(srcPath) {
  let actionsPath = finder.from(srcPath).findFiles('*/actions/index.js')
  if (Array.isArray(actionsPath) && actionsPath.length > 0) {
    return actionsPath[0]
  }

  actionsPath = finder.from(srcPath).findFiles('*/actions.js')
  if (Array.isArray(actionsPath) && actionsPath.length > 0) {
    return actionsPath[0]
  }

  actionsPath = finder.from(srcPath).findFiles('*/actions/*.js')
  if (Array.isArray(actionsPath) && actionsPath.length > 0) {
    return path.dirname(actionsPath[0])
  }

  return '_actions'
}

function getReducerPath(srcPath) {
  let reducerPath = finder.from(srcPath).findFiles('*/reducer/index.js')
  if (Array.isArray(reducerPath) && reducerPath.length > 0) {
    return reducerPath[0]
  }

  reducerPath = finder.from(srcPath).findFiles('*/rootReducer.js')
  if (Array.isArray(reducerPath) && reducerPath.length > 0) {
    return reducerPath[0]
  }

  return '_reducer'
}

module.exports = {
  getImportPath: getImportPath,
  getReducerPath: getReducerPath,
  getActionsPath: getActionsPath
}
