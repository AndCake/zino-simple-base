import buble from 'rollup-plugin-buble';
import eslint from 'rollup-plugin-eslint';
import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-re';
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
import atImport from 'postcss-import';
import cssnano from 'cssnano';

let defaultConfig = {
	input: 'pages/home.js',
	output: {
			file: 'public/pages/home.js',
			format: 'iife',
			sourcemap: process.env.NODE_ENV === 'production' ? false : 'inline'
	},
	name: '__resultComponent',
	banner: `(function (module) {\n\treturn module.exports = function() {\n\t\tvar ENV = ${JSON.stringify(process.env.NODE_ENV || 'development')};`,
	footer: `\treturn __resultComponent;\n\t}\n}(typeof module !== 'undefined' ? module : {}));`
};

let components = [];

let config = glob.sync('pages/**/*.js').
	map(file => {
		if (file.split('/').length > 2) {
			components.push(file);
		}
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
						atImport(),
						simplevars(),
						nested(),
						cssnext({warnForDuplicates: false}),
						url({url: 'inline'}),
						cssnano()
					],
					extensions: ['.css']
				}),
				replace({
					exclude: 'node_modules/**',
					patterns: [{
						transform(code, id) {
							return id.indexOf('.css') >= 0 ? code.replace(/^__\$styleInject/, 'export default (code => code)').replace(/export default undefined/, '') : code;
						}
					}]
				}),
				json(),
				buble({
					transforms: {
						dangerousTaggedTemplateString: true
					},
					exclude: 'node_modules/**',
					jsx: 'this.createNode'
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

if (!fs.existsSync('public')) {
	fs.mkdirSync('public');
}
if (process.env.NODE_ENV !== 'production') {
	fs.writeFileSync('public/styleguide.json', JSON.stringify(components));
}
export default config;
