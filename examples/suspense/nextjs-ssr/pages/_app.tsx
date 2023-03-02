import React from 'react';
import App from 'next/app';
import Head from 'next/head';
import { createGlobalStyle } from 'styled-components';
import initEnvironment from '../relay/createRelayEnvironment';
import { RelayEnvironmentProvider } from 'relay-hooks';

const GlobalStyle = createGlobalStyle`

  body {
    font: 14px 'Helvetica Neue', Helvetica, Arial, sans-serif;
  line-height: 1.4em;
  background: #f5f5f5;
  color: #4d4d4d;
  min-width: 230px;
  max-width: 550px;
  flex-grow: 1;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-weight: 300;
    * {
        -webkit-tap-highlight-color: rgba(255, 255, 255, 0);
    }
  }

  #__next {
    display: flex;
    flex-direction: column;
  }


  &:focus {
    outline: 0;
  }

  button {
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    font-size: 100%;
    vertical-align: baseline;
    font-family: inherit;
    font-weight: inherit;
    color: inherit;
    -webkit-appearance: none;
    appearance: none;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

`;

class ErrorBoundary extends React.Component<any> {
    state = { error: null };
    componentDidCatch(error) {
        this.setState({ error });
    }
    render() {
        const { children, fallback } = this.props;
        const { error } = this.state;
        if (error) {
            return React.createElement(fallback, { error });
        }
        return children;
    }
}

class CustomApp extends App {
    render() {
        const { Component, pageProps } = this.props;

        const environment =
            typeof window === 'undefined'
                ? pageProps.environment
                : initEnvironment({
                      records: pageProps.queryRecords,
                  });

        return (
            <React.Fragment>
                <Head>
                    <title>Relay Hooks Suspense NextJS SSR</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <GlobalStyle />
                <RelayEnvironmentProvider environment={environment}>
                    <ErrorBoundary
                        fallback={({ error }) => `Error: ${error.message + ': ' + error.stack}`}
                    >
                        <React.Suspense fallback={<div>loading suspense</div>}>
                            <Component {...pageProps} />
                        </React.Suspense>
                    </ErrorBoundary>
                </RelayEnvironmentProvider>
            </React.Fragment>
        );
    }
}
export default CustomApp;
