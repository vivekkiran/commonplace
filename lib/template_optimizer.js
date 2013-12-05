function search(tree, typename, callback) {
    if (!tree || !tree.typename) return;
    if (tree.typename === typename) {
        callback(tree);
    }
    if (!tree.fields) return;
    for (var i = 0, field; field = tree.fields[i++];) {
        if (!tree[field]) continue;
        if (tree[field].length) {  // It's an array
            for (var j = 0; j < tree[field].length; j++) {
                search(tree[field][j], typename, callback);
            }
        } else if (typeof tree[field] === 'object') {
            search(tree[field], typename, callback);
        }
    }
}

function safeRemoveWhitespace(value) {
    // Replaces whitespace followed by a `<` with null.
    // `     \n     <foo>` -> `<foo>`
    value = value.replace(/^\s+(?=<)/im, '');
    // Replaces whitespace followed by anything else with a space.
    // `            data-hello="` -> ` data-hello="`
    value = value.replace(/^\s+(?=\w)/im, ' ');

    // Is there work to be done at the end of the string?
    if (value !== value.trimRight()) {
        value = value.trimRight();
        // If the last non-whitespace character is not a `>`, add a space.
        if (value.substr(-1) !== '>') {
            value += ' ';
        }
    }
    // Strip interim whitespace
    // `<li>\n    <a class="` -> `<li>\n<a class="`
    value = value.replace(/(\S\n)\s+(\S)/img, '$1$2');
    return value;
}

function stripWhitespace(tree) {
    search(tree, 'Output', function(output) {
        if (!output.children.length) return;
        var new_children = output.children;
        for (var i = 0; i < output.children.length; i++) {
            var child = output.children[i];
            if (child.typename !== 'TemplateData' ||
                typeof child.value !== 'string') continue;
            if (!child.value.trim()) {
                // If the template data node is only whitespace, just remove it.
                new_children.splice(i, 1);
            } else {
                child.value = safeRemoveWhitespace(child.value);
            }
        }
        output.children = new_children;
    });
    return tree;
}

exports.helpers = [
    '_',
    '_plural',
    'url',
    'api',
    'apiParams',
    'media'
];

exports.optimize = function(tree) {
    stripWhitespace(tree);
    return tree;
};

exports.monkeypatch = function(compiler) {
    /*
    Monkeypatch the symbol compiler to not produce a ton of crap for true and false.
    */
    compiler.origCompileSymbol = compiler.compileSymbol;
    compiler.compileSymbol = function(node, frame) {
        if (node.value === 'True') {
            return this.compileLiteral({value: true});
        }
        if (node.value === 'False') {
            return this.compileLiteral({value: false});
        }
        return this.origCompileSymbol(node, frame);
    };

    function compileTranslationMethod(node, frame) {
        this.emit('context.lookup("' + node.name.value + '")');
        this._compileAggregate(node.args, frame, '(', ')');
    }

    /*
    Monkeypatch the output compiler to not produce a ton of crap for translations.
    */
    compiler.origCompileOutput = compiler.compileOutput;
    compiler.compileOutput = function(node, frame) {
        if (node.children.length === 1) {
            var child = node.children[0];
            if (child.typename === 'FunCall' &&
                child.name.typename === 'Symbol' &&
                exports.helpers.indexOf(child.name.value) !== -1) {
                this.emit(this.buffer + ' += ');
                compileTranslationMethod.call(this, child, frame);
                this.emit(';\n');
                return;
            }
        }
        return this.origCompileOutput(node, frame);
    };

    /*
    Monkeypatch the function call compiler:
    - to not produce debug output (big and un-gzippable)
    - to not do function wrap checks (slow and big)
    */
    compiler.compileFunCall = function(node, frame) {
        if (node.name.value &&
            (node.name.value === '_' || node.name.value === '_plural')) {
            compileTranslationMethod.call(this, node, frame);
            return;
        }
        this._compileExpression(node.name, frame);
        this._compileAggregate(node.args, frame, '(', ')');
    };
};
