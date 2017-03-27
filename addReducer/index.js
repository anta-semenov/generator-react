var Generator = require('yeoman-generator');
var _ = require('lodash');
var finder = require('fs-finder');
var loophole = require('loophole')
var transformer = require('./transformers')
var utils = require('./utils')
var path = require('path')

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
        type: 'list',
        name: 'initResolvingPaths',
        message: 'Setup question: how shoud we import new components',
        choices: [
          {name: 'Relative path', value: 'relative'},
          {name: 'Webpack alias', value: 'alias'},
          {name: 'Webpack root directory', value: 'rootDirectory'}
        ],
        when: () => {
          if (this.config.get('initResolvingPaths')) return false
          return true
        }
      },
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
    if (this.props.initResolvingPaths && !this.config.get('initResolvingPaths')) {
      this.config.set('initResolvingPaths', this.props.initResolvingPaths)
    }
    const resolvingPath = this.config.get('initResolvingPaths') || this.props.initResolvingPaths

    if (this.props.shouldContinue === 'no') {
      return
    }
    this.conflicter.force = true

    const reducerName = _.camelCase(this.props.reducerName)

    //obtain reducer folder
    const reducerFolder = path.dirname(this.props.baseReducer)
    // let rootReducer
    // if (!reducerFolder) {
    //   reducerFolder = finder.from(this.destinationPath('src')).findFile('*/<rootReducer|reducer>.js')
    //   if (reducerFolder) {
    //     rootReducer = reducerFolder
    //     reducerFolder = reducerFolder.replace('/reducer.js', '')
    //   }
    // }

    let actionTypesPath = utils.getActionTypesPath(this.destinationPath('src'))
    if (!actionTypesPath.startsWith('_')) {
      actionTypesPath = path.relative(reducerFolder, actionTypesPath)
    }

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
