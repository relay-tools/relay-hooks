/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

'use strict';

import { TestSchema, parseGraphQLText } from 'relay-test-utils-internal';

import { CodeMarker, CompilerContext, IRTransforms, compileRelayArtifacts } from 'relay-compiler';
import { GeneratedNode } from 'relay-runtime';

/**
 * Parses GraphQL text, applies the selected transforms only (or none if
 * transforms is not specified), and returns a mapping of definition name to
 * its basic generated representation.
 */
export function generateWithTransforms(
    text: string,
    transforms?: Array<any> | null,
): { [key: string]: GeneratedNode } {
    return generate(
        text,
        TestSchema,
        {
            commonTransforms: transforms || [],
            fragmentTransforms: [],
            queryTransforms: [],
            codegenTransforms: [],
            printTransforms: [],
        },
        null,
    );
}

/**
 * Compiles the given GraphQL text using the standard set of transforms (as
 * defined in RelayCompiler) and returns a mapping of definition name to
 * its full runtime representation.
 */
export function generateAndCompile(
    text: string,
    schema?: any | null,
    moduleMap?: { [key: string]: any } | null,
): { [key: string]: GeneratedNode } {
    return generate(text, schema ?? TestSchema, IRTransforms, moduleMap ?? null);
}

function generate(
    text: string,
    schema: any,
    transforms: any,
    moduleMap: { [key: string]: any } | null,
): { [key: string]: GeneratedNode } {
    const relaySchema = schema.extend(IRTransforms.schemaExtensions);
    const { definitions, schema: extendedSchema } = parseGraphQLText(relaySchema, text);
    const compilerContext = new CompilerContext(extendedSchema).addAll(definitions);
    const documentMap = {};
    compileRelayArtifacts(compilerContext, transforms).forEach(([_definition, node]) => {
        const transformedNode = moduleMap != null ? CodeMarker.transform(node, moduleMap) : node;
        documentMap[node.kind === 'Request' ? node.params.name : node.name] = transformedNode;
    });
    return documentMap;
}
