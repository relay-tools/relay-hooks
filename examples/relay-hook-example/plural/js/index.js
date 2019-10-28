import App from './app'
import * as React from 'react';
import ReactDOM from 'react-dom';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.render(
    App,
    rootElement,
  );
}