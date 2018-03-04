import routeImports from '../routes.json';
let routes = routeImports;
let currentRoute = null;

function openPage(route) {
	document.getElementById('page-content').innerHTML = '';
	let el = document.createElement(route.component);
	el.props = route.data;
	document.getElementById('page-content').appendChild(el);
	if (route.title) {
		typeof window !== 'undefined' && (window.title = route.title);
	}

	window.Zino.import.call({}, '/' + route.component + '.js');
}

if (typeof window !== 'undefined' && !window.popstateAttached) {
	window.addEventListener('popstate', function(event) {
		event.state && openPage(event.state);
	}, false);
	window.popstateAttached = true;
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

	getCurrent() {
		return currentRoute;
	},

	getUrl(name, data) {
		let route = Object.keys(routes).filter(route => routes[route].name === name)[0];
		let url = route;

		if (route) {
			url = route.replace(/:([a-z]+)/g, (g, name) => data && data[name] || null);
		}

		return url;
	},

	goto(name, data) {
		let url = this.getUrl(name, data);
		this.open(url);
	},

	open(url) {
		let route = this.route(url);
		currentRoute = route;
		if (typeof window !== 'undefined') {
			history.pushState(route, null, url);
			openPage(route);
		} else {
			// do a redirect
			// ...
		}
	}
};