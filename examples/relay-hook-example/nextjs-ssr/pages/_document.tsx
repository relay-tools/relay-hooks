import Document, {Head, Main, NextScript, DocumentContext} from 'next/document';
import {createGlobalStyle, ServerStyleSheet} from 'styled-components';
import * as React from 'react';

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

type Props = {
  styleTags: string;
};

export default class MyDocument extends Document<Props> {
  static async getInitialProps(ctx) {
    const sheet = new ServerStyleSheet();
    const page = ctx.renderPage(App => props => {
      return sheet.collectStyles(<App {...props} />);
    });
    const styleTags = sheet.getStyleElement();
    return {...page, styleTags};
  }

  render() {
    return (
      <html lang="it">
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          {this.props.styleTags}
        </Head>
        <body>
          <GlobalStyle />
          <Main />
          <NextScript />
        </body>
      </html>
    );
  }
}
