import React from 'react';
import App from 'next/app';
import Head from 'next/head';
import Header from '../components/Header';
import initEnvironment from '../relay/createRelayEnvironment';
import { RelayEnvironmentProvider } from 'relay-hooks';

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
                </Head>

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
