var Generator = require('yeoman-generator');
var _ = require('lodash');
var finder = require('fs-finder');
var transformers = require('./transformers')
var path = require('path')
var utils = require('./utils')

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts)

    this.option('atom', {
      type: JSON.parse,
      default: {}
    })
  }

  prompting() {
    let componentsPaths = finder.from(this.destinationPath('src/components')).findFiles('*/<[A-Z][a-z][A-Za-z0-9]+>.js')
    const components = componentsPaths.map(item => {
      const value = item.split('/').reverse()[0].split('.')[0]
      return {name: value, value, checked: false}
    })
    let parentComponents = [...components]
    parentComponents.splice(0, 0, {name: '', value: ''})

    return this.prompt([
      {
        type: 'list',
        name: 'initProjectType',
        message: 'Setup question: is this a React or React Native project?',
        choices: [
          {name: 'React', value: 'react'},
          {name: 'React Native', value: 'reactNative'}
        ],
        when: () => {
          if (this.config.get('initProjectType')) return false
          return true
        }
      },
      {
        type: 'list',
        name: 'initResolvingPaths',
        message: 'Setup question: how shoud we import new components?',
        choices: [
          {name: 'Relative path', value: 'relative'},
          {name: 'Webpack alias', value: 'alias'},
          {name: 'Webpack root directory', value: 'rootDirectory'}
        ],
        when: answers => {
          if ((this.config.get('initProjectType') || answers.initProjectType) === 'reactNative') {
            return false
          }
          if (this.config.get('initResolvingPaths')) return false
          return true
        }
      },
      {
        type: 'list',
        name: 'initStylePreprocessor',
        message: 'Setup question: what style preprocessor do you use?',
        choices: [
          {name: 'Less', value: 'less'},
          {name: 'Sass/SCSS', value: 'scss'},
          {name: 'PostCSS or plain CSS', value: 'css'}
        ],
        when: answers => {
          if ((this.config.get('initProjectType') || answers.initProjectType) === 'reactNative') {
            return false
          }
          if (this.config.get('initStylePreprocessor')) return false
          return true
        }
      },
      {
       type: 'input',
       name: 'componentName',
       message: 'Name of new component'
      },
      {
        type: 'list',
        name: 'shouldContinue',
        message: 'Component name is already in use. Existing component could be replaced by new one. Should we continue?',
        choices: [{name: 'yes', value: 'yes'}, {name: 'no', value: 'no'}],
        default: 1,
        when: answers => {
          const componentName = _.upperFirst(_.camelCase(answers.componentName))
          if (components.findIndex(item => item.name === componentName) !== -1) {
            return true
          }
          return false
        }
      },
      {
       type: 'list',
       name: 'createReduxConnect',
       message: 'Should we connect component to redux?',
       choices: [{name: 'yes', value: 'yes'}, {name: 'no', value: 'no'}],
       default: 1,
       when: answers => {
         if (answers.shouldContinue === 'no') {
           return false
         }
         return true
       }
      },
      {
       type: 'list',
       name: 'parentComponent',
       message: 'Pick parent component if need',
       choices: parentComponents,
       default: 0,
       when: answers => {
         if (answers.shouldContinue === 'no') {
           return false
         }
         const atom = this.options.atom
         if (atom && atom.treeView && atom.directory) {
           return false
         }
         return true
       }
      },
      {
       type: 'checkbox',
       name: 'importToComponents',
       message: 'Check components where new component should be imported in',
       choices: components,
       default: answers => {
         if (answers.parentComponent !== '') {
           return [answers.parentComponent]
         }
         return []
       },
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
      message: 'Should we create tests file for component (will be created in the component folder and will have suffix "test")?',
      choices: [{name: 'yes', value: 'yes'}, {name: 'no', value: 'no'}],
      default: 1,
      when: answers => {
        if (answers.shouldContinue === 'no') {
          return false
        }
        return true
      }
     }
    ]).then(answers => {
      this.props = answers
      this.async()
    })
  }

  writing() {
    const atom = this.options.atom

    if (this.props.initProjectType && !this.config.get('initProjectType')) {
      this.config.set('initProjectType', this.props.initProjectType)
    }
    const projectType = !this.config.get('initProjectType') || this.props.initProjectType

    if (this.props.initResolvingPaths && !this.config.get('initResolvingPaths') && projectType !== 'reactNative') {
      this.config.set('initResolvingPaths', this.props.initResolvingPaths)
    }
    const resolvingPathMode = projectType === 'reactNative' ? 'relative' : this.config.get('initResolvingPaths') || this.props.initResolvingPaths

    if (this.props.initStylePreprocessor && !this.config.get('initStylePreprocessor') && projectType !== 'reactNative') {
      this.config.set('initStylePreprocessor', this.props.initStylePreprocessor)
    }
    const stylePreprocessor = !this.config.get('initStylePreprocessor') || this.props.initStylePreprocessor

    if (this.props.shouldContinue === 'no') {
      return
    }
    this.conflicter.force = true
    const componentName = _.upperFirst(_.camelCase(this.props.componentName))

    let destFolder = this.destinationPath(`src/components`)
    if (this.props.parentComponent !== '') {
      const parentComponentPath = finder.from(this.destinationPath('src/components')).findFirst().findFiles(`*/${this.props.parentComponent}.js`)
      if (parentComponentPath) {
        destFolder = `${path.dirname(parentComponentPath)}`
      }
    }
    if (atom && atom.treeView && atom.directory) {
      destFolder = `${atom.directory}`
    }
    destFolder = `${destFolder}/${projectType === 'reactNative' && this.props.createReduxConnect === 'no' ? '' : _.lowerFirst(componentName)}`
    destFolder = _.trimEnd(destFolder, '/') + '/'

    if (projectType === 'react') {
      this.fs.copy(this.templatePath('component.less'), `${destFolder}${componentName}.${stylePreprocessor}`)
    }

    this.fs.copyTpl(
      this.templatePath(projectType === 'reactNative' ? 'reactNativeFuncFile.js' : 'reactFuncFile.js'),
      `${destFolder}${componentName}.js`,
      {
        componentName,
        styleImport: projectType === 'react' ? `import './${componentName}.${stylePreprocessor}'\n` : ''
      }
    )

    if (this.props.createReduxConnect === 'yes') {
      this.fs.copyTpl(
        this.templatePath('reduxConnect.js'),
        `${destFolder}${_.lowerFirst(componentName)+'Connect'}.js`,
        {
          componentName,
          actionPath: utils.getImportPath(resolvingPathMode, destFolder, utils.getActionsPath(this.destinationPath('src')), '_actions'),
          reducerPath: utils.getImportPath(resolvingPathMode, destFolder, utils.getReducerPath(this.destinationPath('src')), '_reducer')
        }
      )
    }

    if (Array.isArray(this.props.importToComponents)) {
      const importComponentPath = `${destFolder}${this.props.createReduxConnect === 'yes' ? _.lowerFirst(componentName)+'Connect' : componentName}`
      this.props.importToComponents.forEach(destComponentName => {
        const destComponentPath = finder.from(this.destinationPath('src/components')).findFirst().findFiles(`*/${destComponentName}.js`)
        if (destComponentPath) {
          const componentPath = utils.getImportPath(
            resolvingPathMode,
            path.dirname(destComponentPath),
            importComponentPath,
            componentName
          )
          const fileContent = this.fs.read(destComponentPath)
          this.fs.write(destComponentPath, fileContent.replace(
            /(import.*from[^\n]+'\n|^)(?!import)/,
            `$1import ${componentName} from '${componentPath}'\n`
          ))
        }
      })
    }

    if (this.props.createTests === 'yes') {
      this.fs.copyTpl(this.templatePath('react.test.js'), `${destFolder}${componentName}.test.js`, {componentName})
    }

    if (resolvingPathMode === 'alias') {
      //add alias to webpack configs
      const relativePath = destFolder.replace(
        /^.*\/(?=src\/components)/,
        './'
      ) + (this.props.createReduxConnect === 'yes' ? _.lowerFirst(componentName)+'Connect' : componentName)
      + '.js'

      //check if we have webpackModuleAlias file
      const aliasFilePath = finder.from(this.destinationPath()).findFirst().findFiles('*/webpackModuleAlias.js')
      if (aliasFilePath) {
        this.fs.write(
          aliasFilePath,
          transformers.transformerModuleAlias(this.fs.read(aliasFilePath), componentName, relativePath)
        )
      } else {
        this.fs.write(
          this.destinationPath('webpack.config.dev.js'),
          transformers.transformer(this.fs.read(this.destinationPath('webpack.config.dev.js')), componentName, relativePath)
        )
        this.fs.write(
          this.destinationPath('webpack.config.prod.js'),
          transformers.transformer(this.fs.read(this.destinationPath('webpack.config.prod.js')), componentName, relativePath)
        )
      }
    }
  }
}
