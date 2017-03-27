var j = require('jscodeshift/dist/core');

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

function transformerModuleAlias(file, aliasName, componentRelativePath) {
  const ast = j(file)

  const componentAlias = j.property(
    'init',
    j.identifier(`_${aliasName}`),
    j.callExpression(
      j.memberExpression(j.identifier('path'), j.identifier('resolve'), false),
      [j.literal(componentRelativePath)]
    )
  )

  let mutations = ast.find(j.ObjectExpression)
  .replaceWith(p => {
    p.node.properties.push(componentAlias)
    return p.node
  })
  .size()

  return ast.toSource({quote: 'single', tabWidth: 2})
};

module.exports = {
  transformer: transformer,
  transformerModuleAlias: transformerModuleAlias
}
