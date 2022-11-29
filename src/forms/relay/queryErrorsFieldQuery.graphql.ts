/**
 * @generated SignedSource<<314f1ee8f760d64499cd346f84a8cca6>>
 * @relayHash bcada931a45af33846035fd01b1513e8
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

// @relayRequestID bcada931a45af33846035fd01b1513e8

import { ConcreteRequest, Query } from 'relay-runtime';
export type queryErrorsFieldQuery$variables = {};
export type queryErrorsFieldQuery$data = {
  readonly form: {
    readonly entries: ReadonlyArray<{
      readonly check: string | null;
      readonly error: string | null;
      readonly id: string;
      readonly key: string;
    } | null> | null;
    readonly isSubmitting: boolean | null;
    readonly isValidating: boolean | null;
  } | null;
};
export type queryErrorsFieldQuery = {
  response: queryErrorsFieldQuery$data;
  variables: queryErrorsFieldQuery$variables;
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
    "id": "bcada931a45af33846035fd01b1513e8",
    "metadata": {},
    "name": "queryErrorsFieldQuery",
    "operationKind": "query",
    "text": null
  }
};
})();

(node as any).hash = "9f2fbcaf6e15ad88e2697391bda17a99";

export default node;
