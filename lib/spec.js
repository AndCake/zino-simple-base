let scope = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
scope.Specs = scope.Specs || {};

export default function add(specObject) {
	scope.Specs[specObject.name] = specObject;
}

add.getSpec = function getSpec(name) {
	return scope.Specs[name];
};