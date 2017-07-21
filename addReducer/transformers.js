var j = require('jscodeshift/dist/core');

module.exports = function transformer(source, reducerName) {
  const ast = j(source)
  let mutations1, mutations2, mutations3

  if (ast.find(j.ImportDeclaration, {source: {value: `./${reducerName}`}}).size() === 0) {
    mutations1 = ast.find(j.ImportDeclaration).at(-1)
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

  if (ast.find(j.CallExpression, {calee: {property: {name: 'keys'}}, arguments: [{name: `from${_.upperFirst(reducerName)}`}]}).size() === 0) {
    const exportFromReducer = ast.find(j.MemberExpression, {
      property: {name: 'key'},
      object: {
        property: {name: 'exports'},
        object: {name: 'module'}
      }
    })

    mutations3 = true
    if (exportFromReducer.size() !== 0) {
      exportFromReducer.at(-1).closest(j.ExpressionStatement).closest(j.ExpressionStatement).insertAfter(getExportFromReducerNode(reducerName))
    } else {
      ast.find(j.ExportDefaultDeclaration).at(0).insertAfter(getExportFromReducerNode(reducerName))
    }
  }

  if (mutations1 || mutations2 || mutations3) {
    return ast.toSource({quote: 'single', tabWidth: 2, flowObjectCommas: false})
  }

  return source
}

function getExportFromReducerNode(reducerName) {
  const fromReducer = j.identifier(`from${_.upperFirst(reducerName)}`)
  const reducer = j.identifier(reducerName)
  const key = j.identifier('key')
  const args = j.identifier('args')
  const ifDefault = j.ifStatement(
    j.binaryExpression('===', key, j.literal('default')),
    j.returnStatement(null))

  const exportKeys = j.expressionStatement(
    j.assignmentExpression(
      '=',
      j.memberExpression(
        j.memberExpression(j.identifier('module'), j.identifier('exports'), false),
        key,
        true
      ),
      j.arrowFunctionExpression(
        [j.identifier('state'), j.restElement(args)],
        j.callExpression(
          j.memberExpression(fromReducer, key, true),
          [j.memberExpression(j.identifier('state'), reducer, false), j.spreadElement(args)]
        ),
        true
      )
    )
  )

  return j.expressionStatement(j.callExpression(
  	j.memberExpression(
      j.callExpression(
        j.memberExpression(j.identifier('Object'), j.identifier('keys'), false),
        [fromReducer]
      ),
      j.identifier('forEach'),
      false
    ),
    [j.arrowFunctionExpression(
      [key],
      j.blockStatement([
        ifDefault,
        exportKeys
      ]),
      true
    )]
  ))
}
