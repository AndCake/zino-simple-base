import fs from 'fs';
import Koa from 'koa';
import serve from 'koa-static';
import session from 'koa-session';
import koaBody from 'koa-body';
import router from '../lib/router';
import GlassBil from 'glassbil';
import {zino, setCollector, renderComponent, setBasePath, setStaticBasePath} from 'zino/zino-ssr';

let port = process.argv[2] || 8888;
let basePath = process.cwd();
let isProd = process.env.NODE_ENV === 'production';

const scriptLoader = 'function loadScript(url, cb) {var script = document.createElement(\'script\');script.src = url;script.onload = cb;document.body.appendChild(script);}';
const liveReload = 'setInterval(function(){fetch("/reload.js").then(function(res){return res.ok && res.text() || "";}).then(function(val){if (val) location.reload(); });}, 2500);';
const htmlInspector = 'loadScript("//cdnjs.cloudflare.com/ajax/libs/html-inspector/0.8.2/html-inspector.js", function (){\n\tHTMLInspector.inspect({excludeElements: Object.keys(window.zinoTagRegistry).map(function(e){return e.split("/").pop().replace(/\\.js$/, "");})});\n});';

// prepare zino environment
setBasePath(basePath + '/public/pages');
setStaticBasePath('/pages/');

const store = new GlassBil();

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
		// wait for our data to be finished loading
		store.on('global:data-loaded', (data) => {
			loadedData = data;
			next();
		});
		store.loaded();
	});
	// tell Zino to render the component with the route's data
	const path = route.path || './';
	let result = renderComponent(route.component, path + route.component + '.js', route.data);

	// as soon as the collector above got all the data, we get into our then()
	return result.then(componentHTML => {
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
app.keys = ['H5HVMQBULZXUIKCJFRLGI3SCKFAUA6LBFFDHAYR4NZCD6M3MKRAQ'];
app.use(session(app));
app.use(koaBody());

// serve static files from those directories
app.use(serve('node_modules/zino'));
app.use(serve('public'));

app.use(async ctx => {
	let uri = ctx.path;
	let route = router.route(uri);
	fs.writeFileSync('./public/reload.js', '', 'utf-8');
	if (route) {
		if (route.component) {
			try {
				await renderPage(route, ctx.request, ctx.response);
			} catch (error) {
				console.log('error: ', error);
				ctx.status = 500;
				ctx.type = 'text/html';
				ctx.body = '<h1>500 Internal Server Error</h1><p>Error during initial component rendering:</p><pre>' + error.name + ': ' + error.message + '</pre><p>Reloading in 5s...</p><script>setTimeout(function(){location.reload();}, 5000);</script>';
			}
		} else if (route.rest) {
			try {
				function next(json) {
					ctx.status = 200;
					ctx.type = 'application/json';
					ctx.body = JSON.stringify(json);
				}
				let restAPI = require('./' + route.rest.split(':').shift());
				let json = await restAPI[route.rest.split(':')[1] || ctx.method.toLowerCase()](route.data, ctx);
				next(json);
			} catch (error) {
				console.error(error);
				ctx.status = 500;
				ctx.type = 'text/html';
				ctx.body = '<h1>500 Internal Server Error</h1><p>Error during initial component rendering:</p><pre>' + error.name + ': ' + error.message + '</pre><p>Reloading in 5s...</p><script>setTimeout(function(){location.reload();}, 5000);</script>';
			}
		}
	}
});

app.listen(parseInt(port, 10));

process.stdout.write('Simple server running at\n  => http://localhost:' + port + '/\nCTRL + C to shutdown');
