/**
 * @generated SignedSource<<b3f17c9f834237dae7caddb59ee68fa0>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Query } from 'relay-runtime';
export type queryErrorsFieldQuery$variables = {};
export type queryErrorsFieldQueryVariables = queryErrorsFieldQuery$variables;
export type queryErrorsFieldQuery$data = {
  readonly form: {
    readonly isSubmitting: boolean | null;
    readonly isValidating: boolean | null;
    readonly entries: ReadonlyArray<{
      readonly id: string;
      readonly key: string;
      readonly error: string | null;
      readonly check: string | null;
    } | null> | null;
  } | null;
};
export type queryErrorsFieldQueryResponse = queryErrorsFieldQuery$data;
export type queryErrorsFieldQuery = {
  variables: queryErrorsFieldQueryVariables;
  response: queryErrorsFieldQuery$data;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "EntryForm",
    "kind": "LinkedField",
    "name": "form",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isSubmitting",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isValidating",
        "storageKey": null
      },
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
            "name": "key",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "error",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "check",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "queryErrorsFieldQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "queryErrorsFieldQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "bcada931a45af33846035fd01b1513e8",
    "id": null,
    "metadata": {},
    "name": "queryErrorsFieldQuery",
    "operationKind": "query",
    "text": "bcada931a45af33846035fd01b1513e8"
  }
};
})();

(node as any).hash = "9f2fbcaf6e15ad88e2697391bda17a99";

export default node;
