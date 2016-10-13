var generators = require('yeoman-generator');
var dependencies = require('./dependencies');
var _ = require('lodash');
var finder = require('fs-finder');

module.exports = generators.Base.extend({
  constructor: function () {
    generators.Base.apply(this, arguments);

    this.option('port', {type: 'String', defaults: '3000', desc: 'port where webpack dev server will run'})
  },

  configurating: function () {
    this.config.save();
  },

  prompting: function () {
    return this.prompt([
      {
        type: 'input',
        name: 'appname',
        message: 'Name of app',
        default: _.kebabCase(this.appname)
      },
      {
        type: 'input',
        name: 'port',
        message: 'Type port where webpack dev server should ru',
        default: '3000'
      }
    ]).then(answers => {
      this.props = answers
      this.async()
    })
  },

  writing: function () {
    var tpls = {
      appName: this.props.appname,
      port: this.props.port
    }
    //copy templates
    this.directory(this.templatePath('src'), this.destinationPath('src'));
    this.directory(this.templatePath('tests'), this.destinationPath('tests'));
    this.directory(this.templatePath('localizations'), this.destinationPath('localizations'));
    this.fs.copy(this.templatePath('.gitignore'), this.destinationPath('.gitignore'));
    this.fs.copy(this.templatePath('README.md'), this.destinationPath('README.md'));
    this.fs.copy(this.templatePath('build.js'), this.destinationPath('build.js'));
    this.fs.copy(this.templatePath('webpack.config.prod.js'), this.destinationPath('webpack.config.prod.js'));
    this.fs.copyTpl(this.templatePath('server.js'), this.destinationPath('server.js'), tpls);
    this.fs.copyTpl(this.templatePath('webpack.config.dev.js'), this.destinationPath('webpack.config.dev.js'), tpls);
    this.fs.copyTpl(this.templatePath('_package.json'), this.destinationPath('package.json'), tpls);
    this.fs.copyTpl(this.templatePath('index.html'), this.destinationPath('index.html'), tpls);
  },

  install: function () {
    this.spawnCommandSync('yarn', ['add', ...dependencies.main])
    this.spawnCommandSync('yarn', ['add', ...dependencies.dev], {dev: true})
  },

  end: function () {
    const paths = finder.from(this.destinationPath('')).findFiles('*/.DS_Store')
    paths.forEach(path => {
      this.fs.delete(path)
    })
  }
});
