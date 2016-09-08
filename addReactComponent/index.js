var generators = require('yeoman-generator');
var lodash = require('lodash');
var finder = require('fs-finder');

module.exports = generators.Base.extend({
  constructor: function () {
    generators.Base.apply(this, arguments);
  },

  prompting: function () {
    finder.from(this.destinationPath('src/components')).findFiles('*/<[A-Z][a-z][A-Za-z0-9]+>.js', componentsPaths => {
      var components = componentsPaths.map(item => item.split('/').reverse()[0].split('.')[0])
      var parentComponents = [...components]
      parentComponents.splice(0, 0, '')
      return this.prompt([
       {
         type: 'input',
         name: 'componentName',
         message: 'Name of new component'
       },
       {
         type: 'confirm',
         name: 'createReduxConnect',
         message: 'Should we connect component to redux?',
         default: false
       },
       {
         type: 'list',
         name: 'parrentComponent',
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
     ], answers => {
        this.componentName = answers.componentName;
        this.createReduxConnect = answers.createReducConnect;
        this.parentComponent = answers.parentComponent;
        this.importToComponents = anwers.importToComponents;
      })
    })
  }
})
