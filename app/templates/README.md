Below you will find some information on how to perform common tasks.

You can add react component with addReactComponent subgenerator (command will look like yo react:addReactComponent).
Component that will be added also will be registered in webpack config resolve section as alias, so you don't need to specify relative path in import declaration.
You can just specify: "import ComponentName from 'ComponentName'"
