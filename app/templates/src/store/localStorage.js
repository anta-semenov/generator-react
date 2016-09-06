import throttle from 'lodash/throttle'

export const loadState = () => {
  try {
    const savedState = window.localStorage.getItem('state')
    if (savedState) {
      return JSON.parse(savedState)
    }
    return undefined
  } catch (e) {
    return undefined
  }
}

const saveStateInternal = (state) => {
  const serializedState = JSON.stringify(state)
  try {
    window.localStorage.setItem('state', serializedState)
  } catch (e) {
      //
  }
}

export const saveState = store => throttle(
  () => {saveStateInternal(store.getState())},
  1500
)
