import {createStore, compose, applyMiddleware} from 'redux';
import {persistState} from 'redux-devtools';
import rootReducer from '../reducer';
import DevTools from '../components/root/DevTools';
import thunk from 'redux-thunk'

const enhancer = compose(
  applyMiddleware(thunk),
  DevTools.instrument(),
  persistState(
    window.location.href.match(
      /[?&]debug_session=([^&#]+)\b/
    )
  )
);

export default function configureStore() {
  const store = createStore(rootReducer, enhancer);

  if (module.hot) {
    module.hot.accept('../reducers', () =>
      store.replaceReducer(require('../reducers').default)
    );
  }

  return store;
}
