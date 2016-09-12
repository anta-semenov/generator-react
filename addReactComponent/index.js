var generators = require('yeoman-generator');
var _ = require('lodash');
var finder = require('fs-finder');
var j = require('jscodeshift/dist/core');

module.exports = generators.Base.extend({
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
        name: 'shouldContinue',
        message: 'Component name is already in use. Existing component will be replaced by new one. Should we continue?',
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
  },

  writing: function () {
    if (this.props.shouldContinue === 'no') {
      return
    }
    this.conflicter.force = true
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
    this.fs.copyTpl(this.templatePath('reactFuncFile.js'), `${destFolder}${componentName}.js`, {componentName})

    if (this.props.createReduxConnect === 'yes') {
      this.fs.copyTpl(this.templatePath('reduxConnect.js'), `${destFolder}${_.lowerFirst(componentName)+'Connect'}.js`, {componentName})
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

    if (this.props.createTests === 'yes') {
      this.fs.copyTpl(this.templatePath('react.test.js'), `${destFolder}${componentName}.test.js`, {componentName})
    }

    //add alias to webpack configs
    const relativePath = destFolder.replace(
      /^.*\/(?=src\/components)/,
      './'
    ) + (this.props.createReduxConnect === 'yes' ? _.lowerFirst(componentName)+'Connect' : componentName)
    + '.js'

    this.fs.write(
      this.destinationPath('webpack.config.dev.js'),
      transformer(this.fs.read(this.destinationPath('webpack.config.dev.js')), componentName, relativePath)
    )
    this.fs.write(
      this.destinationPath('webpack.config.prod.js'),
      transformer(this.fs.read(this.destinationPath('webpack.config.prod.js')), componentName, relativePath)
    )
  }
})

function transformer(file, aliasName, componentRelativePath) {
  const ast = j(file)

  const componentAlias = j.property(
    'init',
    j.identifier(`_${aliasName}`),
    j.callExpression(
      j.memberExpression(j.identifier('path'), j.identifier('resolve'), false),
      [j.literal(componentRelativePath)]
    )
  )

  let mutations = ast.find(j.Property, {key: {name: `_${aliasName}`}})
  .replaceWith(componentAlias)
  .size()

  if (!mutations) {
    mutations = ast.find(j.Property, {key: {name: 'alias'}})
    .replaceWith(p => {
      p.node.value.properties.push(componentAlias)
      return p.node
    }).size()
  }

  if (!mutations) {
    const aliasProperty = j.property('init', j.identifier('alias'), j.objectExpression([componentAlias]))

    const resolve = ast.find(j.Property, {key: {name: 'resolve'}})
    .replaceWith(p => {
      p.node.value.properties.push(aliasProperty)
      return p.node
    })
    .size()

    if (!resolve) {
      ast.find(j.Property, {key: {name: 'plugins'}}).insertBefore(
        j.property('init', j.identifier('resolve'), j.objectExpression([aliasProperty]))
      )
    }
  }
  return ast.toSource({quote: 'single', tabWidth: 2})
};
