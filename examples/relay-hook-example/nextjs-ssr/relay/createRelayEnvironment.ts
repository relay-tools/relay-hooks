import {Network} from 'relay-runtime';
import {Store, Environment, RecordSource} from 'relay-runtime';

import fetch from 'isomorphic-unfetch';

let relayEnvironment: Environment;

function fetchQuery(operation, variables, cacheConfig, uploadables) {
  const endpoint = 'http://localhost:3000/graphql';
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }, // Add authentication and other headers here
    body: JSON.stringify({
      query: operation.text, // GraphQL text from input
      variables,
    }),
  }).then(response => response.json());
}

type InitProps = {
  records?: any;
};

const network = Network.create(fetchQuery);

function createEnvironment(records) {
  const recordSource = new RecordSource(records);
  const store = new Store(recordSource);
  const environment = new Environment({
    network,
    store,
  });
  return environment;
}

export default function initEnvironment(options: InitProps = {}) {
  const {records = {}} = options;

  if (typeof window === 'undefined') {
    return createEnvironment(records);
  }

  // reuse Relay environment on client-side
  if (!relayEnvironment) {
    relayEnvironment = createEnvironment(records);
  }

  return relayEnvironment;
}
