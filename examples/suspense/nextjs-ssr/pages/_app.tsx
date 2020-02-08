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

const Suspense = ({children, ssr, reload}) => {
  const [suspense, setSuspense] = React.useState(!ssr);
  React.useEffect(() => {
    if (!suspense && reload) {
      setSuspense(true);
    }
  }, [ssr]);
  return suspense || !ssr ? (
    <React.Suspense fallback={<div>loading suspense</div>}>
      {children}
    </React.Suspense>
  ) : (
    <React.Fragment>{children}</React.Fragment>
  );
};

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
          <Suspense ssr={pageProps.ssr} reload={false}>
            <Component {...pageProps} />
          </Suspense>
        </ErrorBoundary>
      </React.Fragment>
    );
  }
}
export default CustomApp;
