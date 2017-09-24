let routes = {
	'/': {
		title: 'Latest news',
		component: 'newslist'
	},
	'/newstories': {
		title: 'Top news',
		component: 'newslist',
		data: {
			type: 'newstories'
		}
	},
	'/story/:name-:id': {
		title: 'View Story',
		component: 'story-details'
	}
};

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
		history.pushState(route, null, url);
		let el = document.createElement(route.component);
		el.props = route.data;
		document.getElementById('page-content').innerHTML = '';
		document.getElementById('page-content').appendChild(el);
	}
};