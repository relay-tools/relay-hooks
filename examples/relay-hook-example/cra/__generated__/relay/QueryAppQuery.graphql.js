/**
 * @flow
 * @relayHash 5a42211481de3b80c5c49029d3ea01c1
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
import type { Entries_entries$ref } from "./Entries_entries.graphql";
export type QueryAppQueryVariables = {||};
export type QueryAppQueryResponse = {|
  +entries: ?$ReadOnlyArray<?{|
    +$fragmentRefs: Entries_entries$ref
  |}>
|};
export type QueryAppQuery = {|
  variables: QueryAppQueryVariables,
  response: QueryAppQueryResponse,
|};
*/


/*
query QueryAppQuery {
  entries {
    ...Entries_entries
    id
  }
}

fragment Entries_entries on Entry {
  id
  text
}
*/

const node/*: ConcreteRequest*/ = {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "QueryAppQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": [],
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "entries",
        "storageKey": null,
        "args": null,
        "concreteType": "Entry",
        "plural": true,
        "selections": [
          {
            "kind": "FragmentSpread",
            "name": "Entries_entries",
            "args": null
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "QueryAppQuery",
    "argumentDefinitions": [],
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "entries",
        "storageKey": null,
        "args": null,
        "concreteType": "Entry",
        "plural": true,
        "selections": [
          {
            "kind": "ScalarField",
            "alias": null,
            "name": "id",
            "args": null,
            "storageKey": null
          },
          {
            "kind": "ScalarField",
            "alias": null,
            "name": "text",
            "args": null,
            "storageKey": null
          }
        ]
      }
    ]
  },
  "params": {
    "operationKind": "query",
    "name": "QueryAppQuery",
    "id": null,
    "text": "query QueryAppQuery {\n  entries {\n    ...Entries_entries\n    id\n  }\n}\n\nfragment Entries_entries on Entry {\n  id\n  text\n}\n",
    "metadata": {}
  }
};
// prettier-ignore
(node/*: any*/).hash = '8ab7dcc177197f1ffa748bdce2ba8e56';

module.exports = node;
