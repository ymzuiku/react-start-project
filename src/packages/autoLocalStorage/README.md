```js
import autoLocalStorage from 'packages/autoLocalStorage';
import store from 'src/utils/store';

// 监听自动保存 user 中的 info 对象
autoLocalStorage(store, 'react-standard', [['user', 'info']]);
```