var generators = require('yeoman-generator');
var _ = require('lodash');
var finder = require('fs-finder');

module.exports = generators.Base.extend({
  constructor: function () {
    generators.Base.apply(this, arguments);
  },

  prompting: function () {
    let componentsPaths = finder.from(this.destinationPath('src/components')).findFiles('*/<[A-Z][a-z][A-Za-z0-9]+>.js')
    const components = componentsPaths.map(item => {
      const value = item.split('/').reverse()[0].split('.')[0]
      return {name: value, value, checked: false}
    })
    let parentComponents = [...components]
    parentComponents.splice(0, 0, {name: '', value: ''})
    return this.prompt([
      {
       type: 'input',
       name: 'componentName',
       message: 'Name of new component'
      },
      {
       type: 'list',
       name: 'createReduxConnect',
       message: 'Should we connect component to redux?',
       choices: [{name: 'yes', value: 'yes'}, {name: 'no', value: 'no'}],
       default: 1
      },
      {
       type: 'list',
       name: 'parentComponent',
       message: 'Pick parent component if need',
       choices: parentComponents,
       default: 0
      },
      {
       type: 'checkbox',
       name: 'importToComponents',
       message: 'Check components where new component should be imported in',
       choices: components
      }
    ]).then(answers => {
      this.props = answers
      this.async()
    })
  },

  writing: function () {
    const componentName = _.upperFirst(_.camelCase(this.props.componentName))

    let destFolder = this.destinationPath(`src/components/${_.lowerFirst(componentName)}`)
    if (this.props.parentComponent !== '') {
      const parentComponentPath = finder.from(this.destinationPath('src/components')).findFirst().findFiles(`*/${this.props.parentComponent}.js`)
      if (parentComponentPath) {
        destFolder = _.trimEnd(parentComponentPath, `${this.props.parentComponent}.js`) + _.lowerFirst(componentName)
      }
    }
    destFolder = _.trimEnd(destFolder, '/') + '/'

    this.fs.copy(this.templatePath('component.less'), `${destFolder}${componentName}.less`)
    this.fs.copyTpl(this.templatePath('reactFuncFile.js'), `${destFolder}${componentName}.js`, {componentName: componentName})

    if (this.props.createReduxConnect === 'yes') {
      this.fs.copyTpl(this.templatePath('reduxConnect.js'), `${destFolder}${_.lowerFirst(componentName)+'Connect'}.js`, {componentName: componentName})
    }

    if (Array.isArray(this.props.importToComponents)) {
      this.props.importToComponents.forEach(destComponentName => {
        const destComponentPath = finder.from(this.destinationPath('src/components')).findFirst().findFiles(`*/${destComponentName}.js`)
        if (destComponentPath) {
          const fileContent = this.fs.read(destComponentPath)
          this.fs.write(destComponentPath, fileContent.replace(
            /(import[^\n]+'\n|^)(?!import)/,
            `$1import ${componentName} from '_${componentName}'\n`
          ))
        }
      })
    }
  }
})
