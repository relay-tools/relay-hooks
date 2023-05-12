import React from 'react';
import App from 'next/app';
import Head from 'next/head';
import Header from '../components/Header';
import { useEffect } from 'react';
import { Router } from 'next/router';
import initEnvironment from '../relay/createRelayEnvironment';
import { QUERY_APP } from '../components/TodoApp';
import { RelayEnvironmentProvider, useRelayEnvironment } from 'relay-hooks';

let ssrPrefethed = false;

const Routing = ({ ssr, variables, prefetch }) => {
    const environment = useRelayEnvironment();

    if (ssr && !ssrPrefethed) {
        ssrPrefethed = true;
        prefetch.next(environment, QUERY_APP, variables);
    }

    useEffect(() => {
        const handleRouteChange = (url) => {
            const isMe = url === '/';
            console.log('handle', isMe, url);
            prefetch.next(environment, QUERY_APP, { userId: isMe ? 'me' : 'you' });
        };

        Router.events.on('routeChangeStart', handleRouteChange);
        return () => {
            Router.events.off('routeChangeStart', handleRouteChange);
        };
    }, [environment]);
    return null;
};

class CustomApp extends App {
    static async getInitialProps({ Component, ctx }) {
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
        const { environment, prefetch } = initEnvironment();

        const variables = { userId: isMe ? 'me' : 'you' };
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

        return { pageProps };
    }

    render() {
        const { Component, pageProps } = this.props;
        const { environment, prefetch } =
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
                    <Routing prefetch={prefetch} ssr={pageProps.ssr} variables={pageProps.variables} />
                    <Component {...pageProps} prefetch={prefetch} />
                </RelayEnvironmentProvider>
            </React.Fragment>
        );
    }
}
export default CustomApp;
