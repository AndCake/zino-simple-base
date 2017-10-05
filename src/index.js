import http from 'http';
import url from 'url';
import path from 'path';
import fs from 'fs';
import router from '../lib/router';
import {zino, setCollector, renderComponent, setBasePath, setStaticBasePath} from 'zino/zino-ssr';

let port = process.argv[2] || 8888;
let basePath = process.cwd();
let isProd = ENV === 'production';

const scriptLoader = 'function loadScript(url, cb) {var script = document.createElement(\'script\');script.src = url;script.onload = cb;document.body.appendChild(script);}';
const liveReload = 'loadScript("http://" + (location.host || "localhost").split(":")[0] + ":35729/livereload.js?snipver=1");';
const htmlInspector = 'loadScript("//cdnjs.cloudflare.com/ajax/libs/html-inspector/0.8.2/html-inspector.js", function (){\n\tHTMLInspector.inspect({excludeElements: Object.keys(window.zinoTagRegistry).map(function(e){return e.split("/").pop().replace(/\\.js$/, "");})});\n});';

// prepare zino environment
setBasePath(basePath);
setStaticBasePath('/');

http.createServer(function (request, response) {
	let uri = url.parse(request.url).pathname,
		filename = path.join(process.cwd(), uri),
		route = null;

	const contentTypesByExtension = {
		'.html': 'text/html',
		'.css': 'text/css',
		'.js': 'text/javascript'
	};

	// our rest mini service handling
	if (request.method !== 'GET') {
		// we have a REST-like request
		if (request.method === 'POST') {
			let postBody = '';
			request.on('data', (chunk) => {
				postBody += chunk;
			});
			request.on('end', () => {
				// do something with the post body
				if (fs.existsSync(filename)) {
					fs.writeFileSync(filename, postBody);
					response.writeHead(200, {
						'Content-Type': 'application/json'
					});
					response.end(postBody);
				} else {
					response.writeHead(404, {
						'Content-Type': 'text/plain'
					});
					response.end('404 not found');
				}
			});
			return;
		}
	}

	// react to our defined routes
	if ((route = router.route(uri))) {
		// the index.html provides the base structure for our page
		fs.readFile('./index.html', 'utf-8', (err, data) => {
			if (err) {
				// if we cannot find it, bail out!
				response.writeHead(500, {
					'Content-Type': 'text/plain'
				});
				response.write(err + '\n');
				response.end();
				return;
			}

			// clear our require cache so that changes to our components will be reflected
			// on the page without server restart
			Object.keys(require.cache).forEach(function(key) { delete require.cache[key]; });

			// this will hold our collected data from all the stores
			let loadedData = {};

			// set our asynchronous render handling
			setCollector(function(next) {
				if (global.__INITIAL_STATE__) {
					// wait for our data to be finished loading
					zino.on('__global-store:data-loaded', (data) => {
						loadedData = data;
						next();
					});
					zino.trigger('__global-store:check-done');
				} else {
					next();
				}
			});
			// tell Zino to render the component with the route's data
			const path = route.path || 'public/pages/';
			let result = renderComponent(route.component, path + route.component + '.js', route.data);

			// as soon as the collector above got all the data, we get into our then()
			result.then(componentHTML => {
				// prepare our data for template rendering
				let dataMatrix = {
					title: route.title,
					component: componentHTML.body + componentHTML.preloader,
					head: componentHTML.styles,
					path: '/' + path + route.component + '.js',
					storeState: JSON.stringify(loadedData),
					devTools: isProd ? '' : [scriptLoader, liveReload, htmlInspector].join('\n')
				};
				response.writeHead(200, {
					'Content-Type': 'text/html'
				});
				// render the final page
				response.write(data.replace(/\{\{(.*?)\}\}/g, (g, m) => dataMatrix[m]));
				response.end();
			}).catch(error => {
				// if the component could not be rendered correctly bail out
				response.writeHead(500, {
					'Content-Type': 'text/plain'
				});
				response.end('500 - unable to render page: ' + error);
			});
		});
		return;
	}

	// no route matched, so we might have a static file at hand
	fs.exists(filename, function (exists) {
		if (!exists) {
			// fallback to 404 if none has been found
			response.writeHead(404, {
				'Content-Type': 'text/plain'
			});
			response.write('404 Not Found\n');
			response.end();
			return;
		}

		// if it is a directory, append index.html
		if (fs.statSync(filename).isDirectory()) filename += '/index.html';

		// try to read the file
		fs.readFile(filename, 'binary', function (err, file) {
			if (err) {
				response.writeHead(500, {
					'Content-Type': 'text/plain'
				});
				response.write(err + '\n');
				response.end();
				return;
			}

			let headers = {};
			let contentType = contentTypesByExtension[path.extname(filename)];
			if (contentType) headers['Content-Type'] = contentType;
			response.writeHead(200, headers);
			response.write(file, 'binary');
			response.end();
		});
	});
}).listen(parseInt(port, 10));

process.stdout.write('Simple server running at\n  => http://localhost:' + port + '/\nCTRL + C to shutdown');