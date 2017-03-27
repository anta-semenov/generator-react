import React from 'react'
import renderer from 'react-test-renderer'
import <%= componentName %> from './<%= componentName %>'

describe('<%= componentName %>', () => {
  it('Should render', () => {
    const component = renderer.create(<<%= componentName %>/>)
    const tree = component.toJSON()
    expect(tree).toMatchSnapshot()
  })
})
