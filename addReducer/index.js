var generators = require('yeoman-generator');
var _ = require('lodash');
var finder = require('fs-finder');
var j = require('jscodeshift/dist/core');

module.exports = generators.Base.extend({
  prompting: function () {
    const reducersPaths = finder.from(this.destinationPath('src/reducer/')).findFiles('*/<[A-Za-z0-9]+>.js')
    const reducers = reducersPaths.map(item => item.split('/').reverse()[0].split('.')[0])

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
          if (reducers.findIndex(item => item === reducerName) !== -1) {
            return true
          }
          return false
        }
      },
      {
       type: 'list',
       name: 'createTests',
       message: 'Should we create tests file (will be created in the reducers folder and will have suffix "test")?',
       choices: [{name: 'yes', value: 'yes'}, {name: 'no', value: 'no'}],
       default: 0,
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

    const reducerName = _.camelCase(this.props.reducerName)

    //copy files
    this.fs.copyTpl(this.templatePath('reducer.js'), this.destinationPath(`src/reducer/${reducerName}.js`), {reducerName})
    if (this.props.createTests === 'yes') {
      this.fs.copyTpl(this.templatePath('reducer.test.js'), this.destinationPath(`src/reducer/${reducerName}.test.js`), {reducerName})
    }

    //import new reducer to root reducer
    this.fs.write(
      this.destinationPath('src/reducer/index.js'),
      transformer(this.fs.read(this.destinationPath('src/reducer/index.js')), reducerName).replace(/;\r\n|;\n/g, '\n').replace(/\n\n(?=import)/g, '\n')
    )
  }
})

function transformer(source, reducerName) {
  const ast = j(source)
  let mutations1, mutations2

  if (ast.find(j.ImportDeclaration, {source: {value: `./${reducerName}`}}).size() === 0) {
    mutations1 = ast.find(j.ImportDeclaration).at(ast.find(j.ImportDeclaration).size()-1)
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

  if (mutations1 || mutations2) {
    return ast.toSource({quote: 'single', tabWidth: 2, flowObjectCommas: false})
  }

  return source
}
