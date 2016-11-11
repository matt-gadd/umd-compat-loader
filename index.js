const recast = require('recast');
const types = require('ast-types');

function isUMD(content) {
	return content.indexOf('var v = factory(require, exports); if (v !== undefined) module.exports = v;') > -1;
}

function matches(arr) {
	const allowed = [ 'require', 'exports' ];
	if (arr.length !== allowed.length) return;
	return arr.every((item) => allowed.includes(item.name));
}

function fixUMD(content, sourceMap) {
	const ast = recast.parse(content);
	types.visit(ast, {
		visitCallExpression(path) {
			const callee = path.node.callee;
			const args = path.node.arguments;

			if (callee.name === 'factory' && matches(args)) {
				args.forEach((arg, i) => arg.name = 'undefined');
			}

			this.traverse(path);
		},
		visitFunctionExpression(path) {
			const params = path.node.params;

			if (matches(params)) {
				params.forEach((param, i) => param.name = `__no_op${i}__`);
			}

			this.traverse(path);
		}
	});
	return ast;
}

module.exports = function(content, sourceMap) {
	this.cacheable && this.cacheable();

	if (isUMD(content)) {

		const ast = fixUMD(content);

		if(sourceMap) {
			const result = recast.print(ast, { inputSourceMap: sourceMap });
			this.callback(null, result.code, result.map);
			return;
		}

		return recast.print(ast).code;
	}

	if (sourceMap) {
		this.callback(null, content, sourceMap);
	}

	return content;
}
