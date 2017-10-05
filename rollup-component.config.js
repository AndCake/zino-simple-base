import buble from 'rollup-plugin-buble';
import eslint from 'rollup-plugin-eslint';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import json from 'rollup-plugin-json';
import glob from 'glob';
import fs from 'fs';

// postcss plugins
import simplevars from 'postcss-simple-vars';
import url from 'postcss-url';
import nested from 'postcss-nested';
import cssnext from 'postcss-cssnext';
import cssnano from 'cssnano';

let defaultConfig = {
	input: 'pages/home.js',
	output: {
			file: 'public/pages/home.js',
			format: 'iife',
			sourcemap: 'inline'
	},
	name: '__resultComponent',
	banner: `(function (module) {\n\treturn module.exports = function() {`,
	footer: `\treturn __resultComponent;\n\t}\n}(typeof module !== 'undefined' ? module : {}));`
};

let components = [];

let config = glob.sync('pages/**/*.js').
	map(file => {
		components.push(file);
		return Object.assign({}, defaultConfig, {
			input: file,
			output: {
				file: 'public/' + file,
				format: 'iife',
				sourcemap: 'inline'
			},
			plugins: [
				eslint({
					exclude: ['**/styles/*.css', '**/*.json']
				}),
				postcss({
					plugins: [
						simplevars(),
						nested(),
						cssnext({warnForDuplicates: false}),
						url({url: 'inline'}),
						cssnano()
					],
					extensions: ['.css']
				}),
				json(),
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

if (process.env.NODE_ENV !== 'production') {
	fs.writeFileSync('public/styleguide.json', JSON.stringify(components));
}
export default config;