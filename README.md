# umd-compat-loader

Webpack does not like UMD wrappers of the following:

```javascript
(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
});
```

It fails to follow the require down the commonjs path so dependencies are not resolved. It's not possible to switch Webpack to use the AMD path with the imports loader as the `module` variable is provided by Webpack.

This loader simply removes the UMD wrapper - effectively unwrapping it back to commonjs. Recast is used so any sourcemapped source should be correctly remapped.
