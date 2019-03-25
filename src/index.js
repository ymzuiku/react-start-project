import 'src/assets/normal.css';

import React from 'react';
import ReactDOM from 'react-dom';

import App from 'src/routers/App/App';

class Root extends React.Component {
  render() {
    return <App />;
  }
}

ReactDOM.render(<Root />, document.getElementById('root'));
