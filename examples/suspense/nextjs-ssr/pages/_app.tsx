import React from 'react';
import App from 'next/app';
import Head from 'next/head';
import Header from '../components/Header';

class ErrorBoundary extends React.Component<any> {
  state = {error: null};
  componentDidCatch(error) {
    this.setState({error});
  }
  render() {
    const {children, fallback} = this.props;
    const {error} = this.state;
    if (error) {
      return React.createElement(fallback, {error});
    }
    return children;
  }
}

class CustomApp extends App {
  render() {
    const {Component, pageProps} = this.props;

    return (
      <React.Fragment>
        <Head>
          <title>Relay Hooks Suspense NextJS SSR</title>
        </Head>

        <ErrorBoundary
          fallback={({error}) =>
            `Error: ${error.message + ': ' + error.stack}`
          }>
            <React.Suspense fallback={<div>loading suspense</div>}>
              <Component {...pageProps} />
            </React.Suspense>
        </ErrorBoundary>
      </React.Fragment>
    );
  }
}
export default CustomApp;
