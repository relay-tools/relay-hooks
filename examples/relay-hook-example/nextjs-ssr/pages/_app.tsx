import React from 'react';
import App from 'next/app';
import Head from 'next/head';
import Header from '../components/Header';

class CustomApp extends App {
  render() {
    const {Component, pageProps} = this.props;
    return (
      <React.Fragment>
        <Head>
          <title>Relay Hooks NextJS SSR</title>
        </Head>

        <Component {...pageProps} />
      </React.Fragment>
    );
  }
}
export default CustomApp;
