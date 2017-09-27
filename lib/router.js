import routeImports from '../routes.json';
let routes = routeImports;

function openPage(route) {
	let el = document.createElement(route.component);
	el.props = route.data;
	document.getElementById('page-content').innerHTML = '';
	document.getElementById('page-content').appendChild(el);
}

if (typeof window !== 'undefined') {
	window.addEventListener('popstate', function(event) {
		openPage(event.state);
	}, false);
}

export default {
	setRoutes(newRoutes) {
		routes = newRoutes;
	},

	route(path) {
		// if we have a direct match, just return it
		if (routes[path]) return routes[path];

		// if we need more detailed filtering...
		return Object.keys(routes).map(route => {
			let names = [''];
			let routeExpression = route.replace(/\//g, '\\/').replace(/:([a-z]+)/g, (g, name) => {
				names.push(name);
				return '(.*?)';
			}).replace(/\$|\^/g, '\\$&');
			routeExpression = new RegExp('^' + routeExpression + '$');
			let result = routeExpression.exec(path);
			if (!result) return false;
			let data = {};
			names.slice(1).forEach((name, idx) => {
				data[name] = result[idx + 1];
			});
			return Object.assign({}, routes[route], {data});
		}).filter(result => result)[0] || false;
	},

	open(url) {
		let route = this.route(url);
		if (typeof window !== 'undefined') {
			history.pushState(route, null, url);
			openPage(route);
		} else {
			// do a redirect
			// ...
		}
	}
};