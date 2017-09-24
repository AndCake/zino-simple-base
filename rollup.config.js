import buble from 'rollup-plugin-buble';
import eslint from 'rollup-plugin-eslint';

export default {
        input: 'src/index.js',
        output: {
                file: './index.js',
                format: 'cjs'
        },
        external: ['http', 'path', 'url', 'fs', 'zino/zino-ssr', 'immu'],
        plugins: [
                eslint({
                        exclude: []
                }),
                buble({
                        exclude: 'node_modules/**'
                })
        ]
};