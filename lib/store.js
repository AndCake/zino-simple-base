/**
 * A simple generic store implementation with immutable state
 * using action events.
 *
 * Usage:
 * new Store(<Zino instance>, [<options>]);
 *
 * The options parameter is an object which can have the following
 * properties:
 *
 * - name (String) - name of the store (default = 'unnamed'). This name will be used for all action events.
 * - actions (Object) - a key-value pair of actions, whereby the key is the action's name and the value is the function handling the action
 * - initial (Promise/Function) - the initial value of the store
 *
 * The action handlers always receive three parameters, which they
 * can use to modify the store's state. Those are in detail:
 *
 * - state (Object) - the current state of the object, please not that it cannot be modified. Use it's toJS() function in order to get a POJO to modify
 * - data (Any) - the data that was handed into the action event trigger
 * - next (Function) - in case of asynchonous modification, you can use this function in order to hand the final state back into the store
 *
 * After defining the store, the defined actions can be triggered
 * by using the standard zino event handling:
 *
 *     Zino.trigger('<name>:<action>'[, data]);
 *
 * The store will automatically fire :changed events whenever the store's state is modified.
 * Additionally, it will provide an :init event in order to provide initial data to a component.
 *
 * Example:
 *
 * new Store(Zino, {
 *     name: 'comment',
 *     actions: {
 *         added: function(state, data, next) {
 *             fetch(myAPIUrl, {method: 'POST', body: data}).then((response) => {
 *                 return response.json();
 * 			   }).then(function(res) {
 *                 if (res.success) {
 *                     var newState = state.toJS().concat(res.data);
 *                     // send newState asynchronously for UI update after fetch completed
 *                     next(newState);
 *                 }
 *             });
 *         },
 *         removed: function(state, id, next) {
 *             var newState = state.toJS().filter(function(entry) { return entry.id !== id; });
 *             fetch(myAPIUrl, {method: 'DELETE', body: id});
 *             // return new store state for immediate UI update
 *             return newState;
 *         }
 *     }
 * });
 *
 * You can then use it like that:
 * Zino.trigger('comment:added', {author: 'William Carlson', text: 'lorem ipsum dolor sit amet...'});
 *
 */
import immu from 'immu';

let scope = typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : {};
let data = {};

// if we have initial state
if (scope.__INITIAL_STATE__) {
	// import every store's initial state
	Object.keys(scope.__INITIAL_STATE__).forEach(key => {
		data[key] = {
			loaded: true,
			data: immu(scope.__INITIAL_STATE__[key])
		};
	});
	// cleanup the initial state
	delete scope.__INITIAL_STATE__;
} else {
	scope.__INITIAL_STATE__ = true;
}

/**
 * The actual base store implementation
 *
 * @param {Zino} Zino - the reference to zino
 * @param {Object} options - accepted options
 */
export default function(Zino, options = {}) {
	let name = options.name || 'unnamed';
	if (scope[name + 'Store']) return scope[name + 'Store'];
	scope[name + 'Store'] = {
		init: function(target) { Zino.trigger(name + ':init', target); }
	};

	// if we have actions defined on our options
	if (options.actions) {
		// register all the action events
		Object.keys(options.actions).forEach(function(action) {
			Zino.on(name + ':' + action, scope[name + 'Store'][action] = function(triggerData) {
				var entry = options.actions[action];
				// for asynchronous cases, provide a next function to handle state
				// modification
				var next = function(newState) {
					newState = immu(newState);
					if (newState !== data[name].data) {
						data[name].data = newState;
						Zino.trigger(name + ':init');
					}
				};
				var newState = entry(data[name].data, triggerData, next);
				// if it was not done asynchronously
				if (newState) {
					// directly update the state
					next(newState);
				}
			});
		});
	}

	// register our main change notification handler
	Zino.on(name + ':init', (target) => {
		Zino.trigger(name + ':changed', {target, data: data[name] && data[name].data.toJS()});
	});
	// initialize our store data
	data[name] = data[name] || {
		loaded: false,
		data: immu([])
	};
	// if we don't have an initial state and know how to get one
	if (!data[name].loaded && options.initial) {
		let inited = value => {
			data[name] = {data: immu(value)};
			Zino.trigger(name + ':init');
			data[name].loaded = true;
			Zino.trigger('__global-store:check-done');
		};

		// initialize the state
		if (typeof options.initial.then === 'function') {
			// we have a promise
			options.initial.then(inited);
		} else if (typeof options.initial === 'function') {
			// we have a normal callback
			inited(options.initial());
		} else if (typeof options.initial === 'object') {
			inited(options.initial);
		}
	} else {
		// no initial state and no loading instructions provided, so just assume we're done
		data[name].loaded = true;
	}

	if (typeof window === 'undefined') {
		// global event used to provide the data to our server-side handler
		Zino.on('__global-store:check-done', () => {
			let loaded = Object.keys(data).filter(key => {
				return data[key].loaded;
			}).length;

			if (loaded === Object.keys(data).length) {
				let result = {};
				Object.keys(data).map(key => {
					result[key] = data[key].data.toJS();
				});
				Zino.trigger('__global-store:data-loaded', result);
			}
		});
	}

	// provide the outside world with the actions
	return scope[name + 'Store'];
}