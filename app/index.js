var generators = require('yeoman-generator');
var dependencies = require('./dependencies');

module.exports = generators.Base.extend({
  writing: function () {
    //copy templates
    this.directory(this.templatePath('src'), this.destinationPath('src'));
    this.directory(this.templatePath('test'), this.destinationPath('test'));
    this.fs.copy(this.templatePath('.gitignore'), this.destinationPath('.gitignore'));
    this.fs.copy(this.templatePath('build.js'), this.destinationPath('build.js'));
    this.fs.copy(this.templatePath('server.js'), this.destinationPath('server.js'));
    this.fs.copy(this.templatePath('webpack.config.dev.js'), this.destinationPath('webpack.config.dev.js'));
    this.fs.copy(this.templatePath('webpack.config.prod.js'), this.destinationPath('webpack.config.prod.js'));
    this.fs.copyTpl(this.templatePath('_package.json'), this.destinationPath('package.json'), {
      appName: this.appname
    });
    this.fs.copyTpl(this.templatePath('index.html'), this.destinationPath('index.html'), {
      appName: this.appname
    });

    var packages = dependencies.main.reduce(function (result, item) {
      if (!result) {
        return item
      } else {
        return result + ' ' + item
      }
    });
    this.npmInstall(packages + ' --save');

    packages = dependencies.dev.reduce(function (result, item) {
      if (!result) {
        return item
      } else {
        return result + ' ' + item
      }
    });
    this.npmInstall(packages + ' --save-dev');    
  }
});
