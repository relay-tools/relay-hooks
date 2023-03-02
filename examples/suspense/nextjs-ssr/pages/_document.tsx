import Document, { Head, Main, NextScript, Html } from 'next/document';
import { createGlobalStyle, ServerStyleSheet } from 'styled-components';
import * as React from 'react';

type Props = {
    styleTags: string;
};

export default class MyDocument extends Document<Props> {
    /*static async getInitialProps(ctx) {
        const initialProps = await Document.getInitialProps(ctx);
        const sheet = new ServerStyleSheet();
        const page = ctx.renderPage((App) => (props) => {
            return sheet.collectStyles(<App {...props} />);
        });
        const styleTags = sheet.getStyleElement();
        return { ...initialProps, ...page, styleTags };
    }*/
    static async getInitialProps(ctx) {
        const sheet = new ServerStyleSheet();
        const originalRenderPage = ctx.renderPage;

        try {
            ctx.renderPage = () =>
                originalRenderPage({
                    enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />),
                });

            const initialProps = await Document.getInitialProps(ctx);
            return {
                ...initialProps,
                styles: (
                    <>
                        {initialProps.styles}
                        {sheet.getStyleElement()}
                    </>
                ),
            };
        } finally {
            sheet.seal();
        }
    }
    /*
    render() {
        return (
            <Html lang="it">
                <Head>{this.props.styleTags}</Head>
                <body>
                    <GlobalStyle />
                    <Main />
                    <NextScript />
                </body>
            </Html>
        );
    }*/
}
