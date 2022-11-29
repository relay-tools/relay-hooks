/**
 * @generated SignedSource<<456873a8a73fd6689487d051ab6998f4>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { Fragment, ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type queryValueFieldFragment$data = {
  readonly error: string | null;
  readonly id: string;
  readonly value: string | null;
  readonly " $fragmentType": "queryValueFieldFragment";
};
export type queryValueFieldFragment$key = {
  readonly " $data"?: queryValueFieldFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"queryValueFieldFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "queryValueFieldFragment",
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
      "name": "value",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "error",
      "storageKey": null
    }
  ],
  "type": "Entry",
  "abstractKey": null
};

(node as any).hash = "b63b485c6f0bf3d1d4f796302a2229d8";

export default node;
