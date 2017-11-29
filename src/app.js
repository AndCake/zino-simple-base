import fs from 'fs';
import Koa from 'koa';
import serve from 'koa-static';
import router from '../lib/router';
import {zino, setCollector, renderComponent, setBasePath, setStaticBasePath} from 'zino/zino-ssr';

let port = process.argv[2] || 8888;
let basePath = process.cwd();
let isProd = process.env.NODE_ENV === 'production';

const scriptLoader = 'function loadScript(url, cb) {var script = document.createElement(\'script\');script.src = url;script.onload = cb;document.body.appendChild(script);}';
const liveReload = 'loadScript("http://" + (location.host || "localhost").split(":")[0] + ":35729/livereload.js?snipver=1");';
const htmlInspector = 'loadScript("//cdnjs.cloudflare.com/ajax/libs/html-inspector/0.8.2/html-inspector.js", function (){\n\tHTMLInspector.inspect({excludeElements: Object.keys(window.zinoTagRegistry).map(function(e){return e.split("/").pop().replace(/\\.js$/, "");})});\n});';

// prepare zino environment
setBasePath(basePath + '/public/pages');
setStaticBasePath('/pages/');

function renderPage(route, request, response) {
	// the index.html provides the base structure for our page
	let pageSource = fs.readFileSync('./index.html', 'utf-8');

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
	const path = route.path || './';
	let result = renderComponent(route.component, path + route.component + '.js', route.data);

	// as soon as the collector above got all the data, we get into our then()
	result.then(componentHTML => {
		// prepare our data for template rendering
		let dataMatrix = {
			title: route.title,
			component: componentHTML.body + componentHTML.preloader,
			componentProps: 'document.getElementsByTagName("' + route.component + '")[0].props = ' + JSON.stringify(route.data) + ';',
			head: componentHTML.styles,
			name: route.component,
			path: '/pages/' + path + route.component + '.js',
			storeState: JSON.stringify(loadedData),
			devTools: isProd ? '' : [scriptLoader, liveReload, htmlInspector].join('\n')
		};
		response.status = 200;
		response.type = 'text/html';
		// render the final page
		response.body = pageSource.replace(/\{\{(.*?)\}\}/g, (g, m) => dataMatrix[m]);
	}).catch(error => {
		console.log('error: ', error);
		// if the component could not be rendered correctly bail out
		response.status = 500;
		response.type = 'text/html';
		response.body = '<h1>500 Internal Server Error</h1><p>Error during initial component rendering:</p><pre>' + error.name + ': ' + error.message + '</pre><p>Reloading in 5s...</p><script>setTimeout(function(){location.reload();}, 5000);</script>';
	});
}

let app = new Koa();

// serve static files from those directories
app.use(serve('node_modules/zino'));
app.use(serve('public'));

app.use(async ctx => {
	let uri = ctx.path;
	let route = router.route(uri);
	if (route) {
		if (route.component) {
			try {
				renderPage(route, ctx.request, ctx.response);
			} catch (error) {
				console.log('error: ', error);
				ctx.status = 500;
				ctx.type = 'text/html';
				ctx.body = '<h1>500 Internal Server Error</h1><p>Error during initial component rendering:</p><pre>' + error.name + ': ' + error.message + '</pre><p>Reloading in 5s...</p><script>setTimeout(function(){location.reload();}, 5000);</script>';
			}
		} else if (route.rest) {
			try {
				let restAPI = require('./' + route.rest.split(':').shift());
				let json = restAPI[route.rest.split(':')[1] || ctx.method.toLowerCase()](route.data, ctx.request, ctx.response);
				if (json) {
					ctx.status = 200;
					ctx.type = 'application/json';
					ctx.body = JSON.stringify(json);
				}
			} catch (error) {
				ctx.status = 500;
				ctx.type = 'text/html';
				ctx.body = '<h1>500 Internal Server Error</h1><p>Error during initial component rendering:</p><pre>' + error.name + ': ' + error.message + '</pre><p>Reloading in 5s...</p><script>setTimeout(function(){location.reload();}, 5000);</script>';
			}
		}
	}
});

app.listen(parseInt(port, 10));

process.stdout.write('Simple server running at\n  => http://localhost:' + port + '/\nCTRL + C to shutdown');
