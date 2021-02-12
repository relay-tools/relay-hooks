/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable import/no-default-export */
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import sourceMaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';

const makeExternalPredicate = (externalArr) => {
    if (externalArr.length === 0) {
        return () => false;
    }
    const pattern = new RegExp(`^(${externalArr.join('|')})($|/)`);
    return (id) => pattern.test(id);
};

const extensions = ['.ts', '.tsx'];

function createConfigInternal({ format, production }) {
    return {
        input: 'src/index.ts',
        output: {
            file: 'lib/' + format + '-relay-hooks' + (production ? '.min' : '') + '.js',
            format,
            name: 'relay-hooks',
            indent: false,
            globals: {
                'fbjs/lib/areEqual': 'areEqual',
                'fbjs/lib/invariant': 'invariant',
                'fbjs/lib/warning': 'warning',
                react: 'React',
                'relay-runtime': 'relayRuntime',
            },
            sourcemap: true,
            exports: 'named',
        },
        external: makeExternalPredicate([
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.peerDependencies || {}),
        ]),
        plugins: [
            nodeResolve({
                extensions,
            }),
            replace({
                'import * as ': 'import ',
            }),
            typescript({
                tsconfigOverride: {
                    compilerOptions: {
                        declaration: false,
                        declarationMap: false,
                        module: 'es2015',
                        esModuleInterop: true,
                        sourceMap: true,
                        importHelpers: false,
                    },
                },
            }),
            format === 'umd' &&
                commonjs({
                    include: /\/node_modules\//,
                }),
            babel({ extensions, include: ['src/**/*'], babelHelpers: 'bundled' }),
            replace({
                'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
            }),
            sourceMaps(),
            production &&
                terser({
                    output: { comments: false },
                    compress: {
                        keep_infinity: true,
                        pure_getters: true,
                        passes: 10,
                    },
                    ecma: 5,
                    toplevel: format === 'cjs',
                    warnings: true,
                }),
        ],
    };
}

function createConfig(format) {
    return [
        createConfigInternal({ format, production: false }),
        createConfigInternal({ format, production: true }),
    ];
}

export default [...createConfig('cjs'), ...createConfig('es'), ...createConfig('umd')];
