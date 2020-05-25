import React from 'react';
import App from 'next/app';
import Head from 'next/head';
import Header from '../components/Header';
import {useEffect} from 'react';
import {Router} from 'next/router';
import initEnvironment from '../relay/createRelayEnvironment';
import {QUERY_APP} from '../components/TodoApp';
import {RelayEnvironmentProvider, useRelayEnvironment} from 'relay-hooks';

let ssrPrefethed = false;

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

const Routing = ({ssr, variables, prefetch}) => {
  const environment = useRelayEnvironment();

  if (ssr && !ssrPrefethed) {
    ssrPrefethed = true;
    prefetch.next(environment, QUERY_APP, variables);
  }

  useEffect(() => {
    const handleRouteChange = url => {
      const isMe = url === '/';
      prefetch.next(environment, QUERY_APP, {userId: isMe ? 'me' : 'you'});
    };

    Router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      Router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [environment]);
  return null;
};

class CustomApp extends App {
  static async getInitialProps({Component, ctx}) {
    const isServer = !!ctx.req;
    let componentProps = {};

    if (Component.getInitialProps) {
      componentProps = await Component.getInitialProps(ctx);
    }

    if (!isServer) {
      return {
        pageProps: {
          prefetch: null,
          ssr: false,
          environment: null,
        },
      };
    }

    const isMe = ctx.pathname === '/';
    const {environment, prefetch} = initEnvironment();

    const variables = {userId: isMe ? 'me' : 'you'};
    await prefetch.next(environment, QUERY_APP, variables);
    const queryRecords = environment
      .getStore()
      .getSource()
      .toJSON();
    const pageProps = {
      ...componentProps,
      queryRecords,
      environment,
      variables,
      prefetch,
      ssr: true,
    };

    return {pageProps};
  }

  render() {
    const {Component, pageProps} = this.props;
    const {environment, prefetch} =
      typeof window === 'undefined'
        ? pageProps
        : initEnvironment({
            records: pageProps.queryRecords,
          });
    return (
      <React.Fragment>
        <Head>
          <title>Relay Hooks NextJS SSR</title>
        </Head>
        <RelayEnvironmentProvider environment={environment}>
          <Routing
            prefetch={prefetch}
            ssr={pageProps.ssr}
            variables={pageProps.variables}
          />
          <ErrorBoundary
            fallback={({error}) =>
              `Error: ${error.message + ': ' + error.stack}`
            }>
            <Suspense ssr={pageProps.ssr} reload={false}>
              <Component {...pageProps} prefetch={prefetch} />
            </Suspense>
          </ErrorBoundary>
        </RelayEnvironmentProvider>
      </React.Fragment>
    );
  }
}
export default CustomApp;
