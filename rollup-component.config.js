import buble from 'rollup-plugin-buble';
import eslint from 'rollup-plugin-eslint';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss';

import fs from 'fs';

// postcss plugins
import simplevars from 'postcss-simple-vars';
import nested from 'postcss-nested';
import cssnext from 'postcss-cssnext';
import cssnano from 'cssnano';

let defaultConfig = {
	input: 'pages/home.js',
	output: {
			file: 'public/pages/home.js',
			format: 'iife'
	},
	name: '__resultComponent',
	banner: `(function (module) {\n\treturn module.exports = function() {`,
	footer: `\treturn __resultComponent;\n\t}\n}(typeof module !== 'undefined' ? module : {}));`
};

let config = fs.readdirSync('pages').
	filter(file => file[0] !== '.' && !fs.statSync('pages/' + file).isDirectory() && file.endsWith('.js')).
	map(file => {
		return Object.assign({}, defaultConfig, {
			input: 'pages/' + file,
			output: {
				file: 'public/pages/' + file,
				format: 'iife'
			},
			plugins: [
				postcss({
					plugins: [
						simplevars(),
						nested(),
						cssnext({warnForDuplicates: false}),
						cssnano()
					],
					extensions: ['.css']
				}),
				eslint({
					exclude: ['pages/styles/**']
				}),
				buble({
					transforms: {
						dangerousTaggedTemplateString: true
					},
					exclude: 'node_modules/**',
					jsx: 'Tag'
				}),
				resolve({
					jsnext: true
				}),
				commonjs({
					ignore: ['http', 'https']
				})
			]
		});
	});

export default config;