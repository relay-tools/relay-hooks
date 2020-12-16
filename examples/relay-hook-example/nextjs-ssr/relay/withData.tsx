import { DocumentContext } from 'next/document';
import React from 'react';
import { fetchQuery } from 'relay-hooks';
import { GraphQLTaggedNode } from 'relay-runtime';
import { initEnvironment } from './createRelayEnvironment';

type OptionsWithData = {
    query: GraphQLTaggedNode;
    first: number;
};

export const withData = (ComposedComponent: any, options: OptionsWithData): any => {
    function WithData(): JSX.Element {
        return <ComposedComponent {...options} />;
    }

    WithData.getInitialProps = async (ctx: DocumentContext): Promise<any> => {
        const isServer = !!ctx.req;
        let composedInitialProps = {};
        if (ComposedComponent.getInitialProps) {
            composedInitialProps = await ComposedComponent.getInitialProps(ctx);
        }
        if (!isServer) {
            return {
                ...composedInitialProps,
                environment: null,
            };
        }

        let queryRecords = {};
        const environment = initEnvironment();
        const userId = ctx.query && ctx.query.userId ? ctx.query.userId : 'me';

        const { query, first } = options;
        const variables = {
            first,
            userId,
        };
        if (query) {
            await fetchQuery<any>(environment, query, variables);
            queryRecords = environment
                .getStore()
                .getSource()
                .toJSON();
        }
        return {
            ...composedInitialProps,
            queryRecords,
            environment,
        };
    };

    return WithData;
};
