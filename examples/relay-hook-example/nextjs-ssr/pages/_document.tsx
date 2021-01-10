/* eslint-disable import/no-default-export */
import Document, { Head, Main, NextScript } from 'next/document';
import * as React from 'react';
import { ServerStyleSheet } from 'styled-components';

type Props = {
    styleTags: string;
};

export default class MyDocument extends Document<Props> {
    static async getInitialProps(ctx): Promise<any> {
        const sheet = new ServerStyleSheet();
        const page = ctx.renderPage((App: any) => (props): any => {
            return sheet.collectStyles(<App {...props} />);
        });
        const styleTags = sheet.getStyleElement();
        return { ...page, styleTags };
    }

    render(): any {
        return (
            <html lang="it">
                <Head>
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    {this.props.styleTags}
                </Head>
                <body>
                    <Main />
                    <NextScript />
                </body>
            </html>
        );
    }
}
