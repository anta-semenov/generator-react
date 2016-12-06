import {connect} from 'react-redux'
import <%= componentName %> from './<%= componentName %>'
import * as actions from '_actions'
import * as fromReducer from '_reducer'

const mapStateToProps = state => ({

})

const mapDispatchToProps = dispatch => ({

})

const mergeProps = (stateProps, dispatchProps, ownProps) => ({
  ...ownProps
})

export default connect(mapStateToProps, mapDispatchToProps, mergeProps)(<%= componentName %>)
