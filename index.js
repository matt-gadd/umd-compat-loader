const recast = require('recast');
const types = require('ast-types');
const compose = require('recast/lib/util').composeSourceMaps;

function isUMD(content) {
	return content.indexOf('var v = factory(require, exports); if (v !== undefined) module.exports = v;') > -1;
}

function matches(arr) {
	const allowed = [ 'require', 'exports' ];
	if (arr.length !== allowed.length) return;
	return arr.every((item) => allowed.includes(item.name));
}

function fixUMD(content, sourceMap) {
	const ast = recast.parse(content, {
		sourceFileName: sourceMap.file
	});
	types.visit(ast, {
		visitFunctionExpression(path) {
			const params = path.node.params;
			if (matches(params)) {
				const body = ast.program.body;
				body.pop();
				ast.program.body = [ ...body, ...path.node.body.body ];
				this.abort();
			}
			this.traverse(path);
		}
	});
	return ast;
}

module.exports = function(content, sourceMap) {
	this.cacheable && this.cacheable();

	if (isUMD(content)) {
		const ast = fixUMD(content, sourceMap);
		if(sourceMap) {
			const result = recast.print(ast, { sourceMapName: sourceMap.file });
			const map = compose(sourceMap, result.map);
			this.callback(null, result.code, map);
			return;
		}
		return recast.print(ast).code;
	}

	if (sourceMap) {
		this.callback(null, content, sourceMap);
		return;
	}
	return content;
}
