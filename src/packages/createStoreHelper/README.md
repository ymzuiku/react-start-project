创建 sagaAction,  src/actions/sagas.js:

```js
import axios from 'axios';
import * as actions from './actions';

/** 获取照片信息 */
export function sagaOfUserGetPhotos() {
  return {
    type: 'sagaOfUserGetPhotos',
    saga({ call, put }) {
      return function*() {
        try {
          const res = yield call(axios.get, ['https://pixabay.com/api/?key=8089180-a586bdfbeea5884bd5e24a138']);
          if (res && res.data) {
            yield put(actions.actionOfSetUserPhotos(res.data));
          }
        } catch (error) {
          yield put(actions.actionOfSetUserPhotosError());
        }
      };
    },
  };
}

/** 获取照片信息 */
export function sagaOfUserUpdatePhotos(data) {
  return {
    type: 'sagaOfUserGetPhotos',
    saga({ call, put }) {
      return function*() {
        try {
          const res = yield call(axios.put, [
            'https://pixabay.com/api/?key=8089180-a586bdfbeea5884bd5e24a138',
            ...data,
          ]);
          if (res && res.data) {
            yield put(actions.actionOfSetUserPhotos(res.data));
          }
        } catch (error) {
          yield put(actions.actionOfSetUserPhotosError());
        }
      };
    },
  };
}

```


创建 store, 绑定 sagas,  src/utils/store.js: 

```js
import { Map } from 'immutable';

import * as sagas from 'src/actions/sagas';
import createStoreWithSaga from 'packages/createStoreWithSaga';

const store = createStoreWithSaga(sagas);

// 初始化 state
const initState = Map({
  user: '',
});

store.dispatch({ type: 'init-state', reducer: () => initState });

export default store;

```

创建 Provider, 绑定 store, src/Initialize.js:

```js
import React, { Component } from 'react';
import { Provider } from 'react-redux';

import store from 'src/utils/store';

class Initialize extends Component {
  render() {
    return (
      <Provider store={store}>
        <Router>
          {...}
        </Router>
      </Provider>
    );
  }
}

export default Initialize;
```