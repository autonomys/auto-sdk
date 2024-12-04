import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'

export default [
  {
    input: 'src/node.ts',
    output: {
      file: 'dist/node.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      resolve({
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      json(),
    ],
  },
  {
    input: 'src/browser.ts',
    output: {
      file: 'dist/browser.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      resolve({
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      json(),
    ],
  },
]
