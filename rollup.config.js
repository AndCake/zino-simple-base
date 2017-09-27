import buble from 'rollup-plugin-buble';
import eslint from 'rollup-plugin-eslint';

export default {
        input: 'src/index.js',
        output: {
                file: './index.js',
                format: 'cjs',
                banner: 'const ENV = ' + JSON.stringify(process.env.NODE_ENV || 'development') + ';'
        },
        external: ['http', 'path', 'url', 'fs', 'zino/zino-ssr', 'immu', 'now-promise'],
        plugins: [
                eslint({
                        exclude: []
                }),
                buble({
                        exclude: 'node_modules/**'
                })
        ]
};