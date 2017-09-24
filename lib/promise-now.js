function SyncPromise(fn) {
	let resolveValue, rejectValue;

	this.then = function(resolve, reject) {
		return new SyncPromise(function(resFn, rejFn) {
			if (!rejectValue) {
				resFn(resolve(resolveValue));
			} else {
				rejFn(reject(rejectValue));
			}
		});
	};
	this.catch = function(reject) {
		if (rejectValue) {
			reject(rejectValue);
		}
	};

	function resolveFn(data) {
		resolveValue = data;
	}
	function rejectFn(data) {
		rejectValue = data || 'Error';
	}
	fn(resolveFn, rejectFn);
}

SyncPromise.all = function(values) {
	return new SyncPromise((resolve, reject) => {
		let result = [];
		values.forEach(entry => {
			if (entry instanceof SyncPromise) {
				entry.then(value => {
					result.push(value);
					if (result.length === values.length) {
						resolve(result);
					}
				}).catch(e => reject(e));
			} else {
				result.push(entry);
			}
		});
	});
};

module.exports = typeof Promise === 'undefined' ? SyncPromise : Promise;