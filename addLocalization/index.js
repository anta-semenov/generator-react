var generators = require('yeoman-generator');
var _ = require('lodash');
var finder = require('fs-finder');

module.exports = generators.Base.extend({
  prompting: function () {
    return this.prompt([
      {
        type: 'input',
        name: 'locale',
        message: 'type new locale'
      },
      {
        type: 'list',
        name: 'shouldContinue',
        message: 'This locale already exist. It will be replaced by new one. Should we continue?',
        choices: [{name: 'yes', value: 'yes'}, {name: 'no', value: 'no'}],
        default: 1,
        when: answers => {
          if (finder.in(this.destinationPath()).findFirst().findDirectory('localizations') === null) {
            return false
          }
          const localizationPaths = finder.in(this.destinationPath('localizations')).findFiles('/*.json')
          const localizations = localizationPaths.map(item => item.split('/').reverse()[0].split('.')[0])
          
          if (localizations.findIndex(item => item === _.lowerCase(answers.locale)) !== -1) {
            return true
          }
          return false
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

    const locale = _.lowerCase(this.props.locale)
    //write locale json
    const basicJSON = this.fs.readJSON(this.destinationPath('localizations/basic.json'), {})
    Object.keys(basicJSON).forEach(key => {
      basicJSON[key] = ''
    })
    this.fs.writeJSON(this.destinationPath(`localizations/${locale}.json`), basicJSON)

    //add locale to index.html
    const indexHtml = this.fs.read(this.destinationPath('index.html'), {defaults: undefined})
    if (indexHtml && indexHtml.indexOf(`<link rel='localization' hreflang='${locale}' href='/localizations/${locale}.json'`) === -1) {
      this.fs.write(this.destinationPath('index.html'), indexHtml.replace(
        /\n(\s*)(<link rel='localization'.*\/>\n)(?!\s*<link rel='localization)/,
        `$&$1<link rel='localization' hreflang='${locale}' href='/localizations/${locale}.json' type='application/vnd.oftn.l10n+json'/>\n`
      ))
    }
  }
})
