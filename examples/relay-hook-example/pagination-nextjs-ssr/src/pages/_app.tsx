/* eslint-disable import/no-default-export */
import App from 'next/app';
import Head from 'next/head';
import React from 'react';
import { RelayEnvironmentProvider } from 'relay-hooks';
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import { initEnvironment } from '../relay/createRelayEnvironment';
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
const theme = {
  colors: {
    primary: 'blue',
    secondary: 'green',
  },
}

const isServer = typeof window === 'undefined';
function CustomApp(props: any) {
        const { Component, pageProps } = props;
        const { queryRecords: records } = pageProps;
        /* eslint-disable indent */
        const environment = isServer
            ? pageProps.environment
            : initEnvironment({
                  records,
              });
        /* eslint-enable indent */
        return (
          
            <React.Fragment>
              
                <GlobalStyle />
                <RelayEnvironmentProvider environment={environment}>
                  <ThemeProvider theme={theme}>
                      <Component {...pageProps} />
                  </ThemeProvider>
                </RelayEnvironmentProvider>
                    
            </React.Fragment>
        );
    }
export default CustomApp;
