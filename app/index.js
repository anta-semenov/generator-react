var generators = require('yeoman-generator');
var dependencies = require('./dependencies');
var lodash = require('lodash');

module.exports = generators.Base.extend({
  constructor: function () {
    generators.Base.apply(this, arguments);

    this.option('port', {type: 'String', defaults: '3000', desc: 'port where webpack dev server will run'})
  },

  configurating: function () {
    this.config.save();
  },

  writing: function () {
    var tpls = {
      appName: this.appname,
      port: this.options.port
    }
    //copy templates
    this.directory(this.templatePath('src'), this.destinationPath('src'));
    this.directory(this.templatePath('tests'), this.destinationPath('tests'));
    this.fs.copy(this.templatePath('.gitignore'), this.destinationPath('.gitignore'));
    this.fs.copy(this.templatePath('build.js'), this.destinationPath('build.js'));
    this.fs.copy(this.templatePath('webpack.config.prod.js'), this.destinationPath('webpack.config.prod.js'));
    this.fs.copyTpl(this.templatePath('server.js'), this.destinationPath('server.js'), tpls);
    this.fs.copyTpl(this.templatePath('webpack.config.dev.js'), this.destinationPath('webpack.config.dev.js'), tpls);
    this.fs.copyTpl(this.templatePath('_package.json'), this.destinationPath('package.json'), tpls);
    this.fs.copyTpl(this.templatePath('index.html'), this.destinationPath('index.html'), tpls);
  },

  install: function () {
    this.npmInstall(dependencies.main, {save: true});
    this.npmInstall(dependencies.dev, {saveDev: true});
  }
});
