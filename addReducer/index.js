var Generator = require('yeoman-generator');
var _ = require('lodash');
var finder = require('fs-finder');
var j = require('jscodeshift/dist/core');
var loophole = require('loophole')

module.exports = Generator.extend({
  prompting: function () {
    const reducersPaths = finder.from(this.destinationPath('src/reducer/')).findFiles('*/<[A-Za-z0-9]+>.js')
    const reducers = reducersPaths.map(item => {
      const pathParts = item.split('/').reverse()
      const filename = pathParts[0].split('.')[0]
      if (filename !== 'index') {
        return ({
          value: item,
          id: filename,
          name: filename
        })
      } else if (pathParts[1] === 'reducer') {
        return ({
          value: item,
          id: 'rootReducer',
          name: 'rootReducer'
        })
      } else {
        return ({
          value: item,
          id: pathParts[1],
          name: pathParts[1]
        })
      }
    })

    return this.prompt([
      {
       type: 'input',
       name: 'reducerName',
       message: 'Name of new reducer'
      },
      {
        type: 'list',
        name: 'shouldContinue',
        message: 'Reducer name is already in use. Existing reducer will be replaced by new one. Should we continue?',
        choices: [{name: 'yes', value: 'yes'}, {name: 'no', value: 'no'}],
        default: 1,
        when: answers => {
          const reducerName = _.camelCase(answers.reducerName)
          if (reducers.findIndex(item => item.id === reducerName) !== -1) {
            return true
          }
          return false
        }
      },
      {
        type: 'list',
        name: 'reducerType',
        message: 'Select type of reducer',
        choices: [{name: 'simple', value: 'simple'}, {name: 'complex', value: 'complex'}],
        default: 0,
        when: answers => {
          if (answers.shouldContinue === 'no') {
            return false
          }
          return true
        }
      },
      {
        type: 'list',
        name: 'baseReducer',
        message: 'Select reducer where to import new one',
        choices: reducers.filter(item => !!item.value),
        default: 0,
        when: answers => {
          if (answers.shouldContinue === 'no') {
            return false
          }
          return true
        }
      },
      {
       type: 'list',
       name: 'createTests',
       message: 'Should we create tests file (will be created in the reducers folder and will have suffix "test")?',
       choices: [{name: 'yes', value: 'yes'}, {name: 'no', value: 'no'}],
       default: 0,
       when: answers => {
         if (answers.shouldContinue === 'no' || answers.reducerType === 'complex') {
           return false
         }
         return true
       }
      }
    ]).then(answers => {
      this.props = answers
      this.async()
    })
  },

  writing: function () {
    if (this.props.shouldContinue === 'no') {
      return
    }
    this.conflicter.force = true

    const reducerName = _.camelCase(this.props.reducerName)

    //obtain reducer folder
    const baseReducerPathParts = this.props.baseReducer.split('/')
    baseReducerPathParts.pop()
    let reducerFolder = baseReducerPathParts.join('/')
    // let rootReducer
    // if (!reducerFolder) {
    //   reducerFolder = finder.from(this.destinationPath('src')).findFile('*/<rootReducer|reducer>.js')
    //   if (reducerFolder) {
    //     rootReducer = reducerFolder
    //     reducerFolder = reducerFolder.replace('/reducer.js', '')
    //   }
    // }
    const actionTypesPreffix = baseReducerPathParts.slice(baseReducerPathParts.findIndex(item => item === 'src'))
      .reverse()
      .reduce((result, item) => {
        if (item !== 'src') {
          return `../${result}`
        }
        return result
      }, '')
    const actionTypesPath = `${actionTypesPreffix}${getActionTypesPath(this.destinationPath('src'))}`

    //copy files
    if (this.props.reducerType === 'simple') {
      this.fs.copyTpl(this.templatePath('reducer.js'), `${reducerFolder}/${reducerName}.js`, {reducerName, actionTypesPath})
      if (this.props.createTests === 'yes') {
        this.fs.copyTpl(this.templatePath('reducer.test.js'), `${reducerFolder}/${reducerName}.test.js`, {reducerName})
      }
    } else {
      this.fs.copyTpl(this.templatePath('complexReducer.js'), `${reducerFolder}/${reducerName}/index.js`, {reducerName})
    }


    //import new reducer to root reducer
    //rootReducer = rootReducer || `${reducerFolder}/index.js`
    this.fs.write(
      this.props.baseReducer,
      transformer(this.fs.read(this.props.baseReducer), reducerName)
        .replace(/;\r\n|;\n/g, '\n')
        .replace(/\n\n(?=import)/g, '\n')
        .replace(/if \(key === 'default'\)\n(?=\s*return)/g, 'if (key === \'default\') ')
        .replace(/return\n\n(?=\s*module.exports\[key\])/g, 'return\n')
    )
  }
})

function transformer(source, reducerName) {
  const ast = j(source)
  let mutations1, mutations2, mutations3

  if (ast.find(j.ImportDeclaration, {source: {value: `./${reducerName}`}}).size() === 0) {
    mutations1 = ast.find(j.ImportDeclaration).at(-1)
    .insertAfter(j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier(reducerName)), j.importNamespaceSpecifier(j.identifier(`from${_.upperFirst(reducerName)}`))],
      j.literal(`./${reducerName}`)
    )).size()
  }

  if (ast.find(j.Property, {key: {name: reducerName}, value: {name: reducerName}, shorthand: true}).size() === 0) {
    mutations2 = ast.find(j.CallExpression, {callee: {name: 'combineReducers'}}).replaceWith(p => {
      const reducerProperty = j.property('init', j.identifier(reducerName), j.identifier(reducerName))
      reducerProperty.shorthand = true
      p.node.arguments[0].properties.push(reducerProperty)
      return p.node
    }).size()
  }

  if (ast.find(j.CallExpression, {calee: {property: {name: 'keys'}}, arguments: [{name: `from${_.upperFirst(reducerName)}`}]}).size() === 0) {
    const exportFromReducer = ast.find(j.MemberExpression, {
      property: {name: 'key'},
      object: {
        property: {name: 'exports'},
        object: {name: 'module'}
      }
    })

    mutations3 = true
    if (exportFromReducer.size() !== 0) {
      exportFromReducer.at(-1).closest(j.ExpressionStatement).closest(j.ExpressionStatement).insertAfter(getExportFromReducerNode(reducerName))
    } else {
      ast.find(j.ExportDefaultDeclaration).at(0).insertAfter(getExportFromReducerNode(reducerName))
    }
  }

  if (mutations1 || mutations2 || mutations3) {
    return ast.toSource({quote: 'single', tabWidth: 2, flowObjectCommas: false})
  }

  return source
}

function getExportFromReducerNode(reducerName) {
  const fromReducer = j.identifier(`from${_.upperFirst(reducerName)}`)
  const reducer = j.identifier(reducerName)
  const key = j.identifier('key')
  const ifDefault = j.ifStatement(
    j.binaryExpression('===', key, j.literal('default')),
    j.returnStatement(null))

  const exportKeys = j.expressionStatement(
    j.assignmentExpression(
      '=',
      j.memberExpression(
        j.memberExpression(j.identifier('module'), j.identifier('exports'), false),
        j.identifier('key'),
        true
      ),
      j.arrowFunctionExpression(
        [j.identifier('state')],
        j.callExpression(
          j.memberExpression(fromReducer, key, true),
          [j.memberExpression(j.identifier('state'), reducer, false)]
        ),
        true
      )
    )
  )

  return j.expressionStatement(j.callExpression(
  	j.memberExpression(
      j.callExpression(
        j.memberExpression(j.identifier('Object'), j.identifier('keys'), false),
        [fromReducer]
      ),
      j.identifier('forEach'),
      false
    ),
    [j.arrowFunctionExpression(
      [key],
      j.blockStatement([
        ifDefault,
        exportKeys
      ]),
      true
    )]
  ))
}

function getActionTypesPath(srcPath) {
  let actionTypesPath = finder.from(srcPath).findFiles('*/actionTypes.js')
  if (Array.isArray(actionTypesPath) && actionTypesPath.length > 0) {
    return getInSrcPathPart(`${srcPath}/`, actionTypesPath[0])
  }

  actionTypesPath = finder.from(srcPath).findFiles('*/constants/actions.js')
  if (Array.isArray(actionTypesPath) && actionTypesPath.length > 0) {
    return getInSrcPathPart(`${srcPath}/`, actionTypesPath[0])
  }

  return '_actionTypes'
}

function getInSrcPathPart(srcPath, destinationPath) {
  return destinationPath.substr(srcPath.length)
}
