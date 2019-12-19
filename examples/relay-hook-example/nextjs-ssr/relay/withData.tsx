import React from 'react';
import initEnvironment from './createRelayEnvironment';
import {fetchQuery, RelayEnvironmentProvider} from 'relay-hooks';
import {Variables, GraphQLTaggedNode} from 'relay-runtime';
import {DocumentContext} from 'next/document';
import {NextPage} from 'next';

type OptionsWithData = {
  query: GraphQLTaggedNode;
  variables: Variables;
};

export default (ComposedComponent: NextPage, options: OptionsWithData) => {
  function WithData(dataprops) {
    const environment =
      typeof window === 'undefined'
        ? dataprops.environment
        : initEnvironment({
            records: dataprops.queryRecords,
          });
    return (
      <RelayEnvironmentProvider environment={environment}>
        <ComposedComponent />
      </RelayEnvironmentProvider>
    );
  }

  WithData.getInitialProps = async (ctx: DocumentContext) => {
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

    const {query, variables} = options;
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
