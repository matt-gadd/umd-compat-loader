const recast = require('recast');
const types = require('ast-types');
const compose = require('recast/lib/util').composeSourceMaps;
const loaderUtils = require("loader-utils");
const b = types.builders;

function sniff(content) {
	return content.indexOf('var v = factory(require, exports); if (v !== undefined) module.exports = v;') > -1;
}

function matches(arr) {
	const allowed = [ 'require', 'exports' ];
	if (arr.length !== allowed.length) return;
	return arr.every((item, i) => allowed[i] === item.name);
}

function isDefine(path) {
	return path.node.callee.name === 'define';
}

function convert(content, sourceMap, amd) {
	let defineCall;
	const args = {}

	if (sourceMap) {
		args.sourceFileName = sourceMap.file
	}

	const ast = recast.parse(content, args);

	const visitors = {
		visitFunctionExpression(path) {
			const params = path.node.params;
			if (matches(params)) {
				const body = ast.program.body;
				body.pop();
				if (amd) {
					defineCall.arguments[1] = path.node;
					ast.program.body = [ ...body, b.expressionStatement(defineCall) ];
				} else {
					ast.program.body = [ ...body, ...path.node.body.body ];
				}
				this.abort();
			}
			this.traverse(path);
		}
	};

	if (amd) {
		visitors.visitCallExpression = function (path) {
			if (isDefine(path)) {
				defineCall = path.node;
			}
			this.traverse(path);
		}
	}

	types.visit(ast, visitors);
	return ast;
}

module.exports = function(content, sourceMap) {
	const query = loaderUtils.parseQuery(this.query);
	this.cacheable && this.cacheable();

	if (sniff(content)) {
		const ast = convert(content, sourceMap, query.amd);
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
