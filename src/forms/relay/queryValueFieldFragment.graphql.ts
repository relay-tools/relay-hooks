/* tslint:disable */
/* eslint-disable */

import { ReaderFragment } from "relay-runtime";
import { FragmentRefs } from "relay-runtime";
export type queryValueFieldFragment = {
    readonly id: string;
    readonly value: string | null;
    readonly error: string | null;
    readonly " $refType": "queryValueFieldFragment";
};
export type queryValueFieldFragment$data = queryValueFieldFragment;
export type queryValueFieldFragment$key = {
    readonly " $data"?: queryValueFieldFragment$data;
    readonly " $fragmentRefs": FragmentRefs<"queryValueFieldFragment">;
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
(node as any).hash = 'b63b485c6f0bf3d1d4f796302a2229d8';
export default node;
