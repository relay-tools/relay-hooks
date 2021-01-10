/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type Entries_entries$ref = any;
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
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "QueryAppQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Entry",
        "kind": "LinkedField",
        "name": "entries",
        "plural": true,
        "selections": [
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "Entries_entries"
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "QueryAppQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Entry",
        "kind": "LinkedField",
        "name": "entries",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "id",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "text",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "35dc4fc4d4f0b6d5bff3be0988dbf0b4",
    "id": null,
    "metadata": {},
    "name": "QueryAppQuery",
    "operationKind": "query",
    "text": "query QueryAppQuery {\n  entries {\n    ...Entries_entries\n    id\n  }\n}\n\nfragment Entries_entries on Entry {\n  id\n  text\n}\n"
  }
};
// prettier-ignore
(node/*: any*/).hash = '8ab7dcc177197f1ffa748bdce2ba8e56';

module.exports = node;
