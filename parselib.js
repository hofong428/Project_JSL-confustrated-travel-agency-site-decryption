const parse = require('@babel/parser')
const traverse = require('@babel/traverse').default
const generator = require('@babel/generator').default
const fs = require('fs')
const types = require('@babel//types')

//js transform to ast tree
// js_code = 'var a = "\u0068\u0065\u006c\u006c\u006f\u002c\u0041\u0053\u0054"'

js_code = fs.readFileSync('encode.js', {encoding: 'utf-8'})

let ast = parse.parse(js_code);

// console.log(JSON.stringify(ast,null,'\t'));

// edit plug-ins to modify the ast tree

visitor = {
    VariableDeclarator(path)
    {
        // console.log(path.node); // present the current path node
        console.log(path.type); // current path type
        // console.log(path.toString()); // source code
        // console.log(path.parentPath.node); //parent path
        Declaration = path.parent; //parent node
        // console.log(Declaration.get('declarations').toString());
        // console.log(Declaration.declarations[0].id.name); //child node
        //  console.log(Declaration.declarations[0].init.value) //child node
        console.log(path.container); //sibling node

    }
}
// two arguments: ast tree, plug-in
// traverse(ast, visitor)

//encoding
visitor1 = {
    StringLiteral(path)
    {
        path.node.extra.raw = path.node.rawValue;
    }
}

// traverse(ast, visitor1)
// manage the numeric operator
const visitor2 = {
    BinaryExpression(path)
    {
        let {left, operator, right} = path.node;
        if (types.isNumericLiteral(left) &&  operator == '+' && types.isNumericLiteral(right))
        {
            value = left.value + right.value
            path.replaceWith(types.valueToNode(value));

        }

        // manage string
        if (types.isStringLiteral(left) && operator == '+' && types.isStringLiteral(right))
        {
            value = left.value + right.value
            path.replaceWith(types.valueToNode(value));
        }


    }
}

// traverse(ast, visitor2)

// manage the Immediately Invoked Function Expression (IIFE)
visitor3 = {
    UnaryExpression(path)
    {
        let {argument} = path.node;
        if(!types.isFunctionExpression(argument))
        {
            return;
        }
        let {body, id, params} = argument;
        if (id != null || params.length !=0)
        {
            return;
        }
        path.replaceWithMultiple(body.body);
    }
}
traverse(ast,visitor3)

// Multiple
// visitor4 = {
//     CallExpression(path) {
//         let {callee, arguments} = path.node
//         let object = callee.object.value;
//         let property = callee.property.value;
//         let argument = arguments[0].value;
//         array = object[property](argument);
//         path.replaceWithMultiple(types.valueToNode(array))
//     }
// }
// traverse(ast,visitor4)

visitor5 = {
    "BinaryExpression|Identifier"(path) {
        const {confident, value} = path.evaluate();
        confident && path.replaceInline(types.valueToNode(value))
    }
}
// traverse(ast,visitor5)

//general plug-in
const constantFold  = {
    "BinaryExpression|UnaryExpression|ConditionalExpression"(path) {
        //prevent overflow
        if(path.isUnaryExpression({operator:"-"}) ||
    	   path.isUnaryExpression({operator:"void"}))
    	{
    		return;
    	}
        const {confident, value} = path.evaluate();
        if (!confident)
            return;
        if (typeof value == 'number' && (!Number.isFinite(value))) {
            return;
        }
        path.replaceWith(types.valueToNode(value));
    },
}
traverse(ast, constantFold);

//encoding plug-in
const transform_literal = {
  NumericLiteral({node}) {
    if (node.extra && /^0[obx]/i.test(node.extra.raw)) {
      node.extra = undefined;
    }
  },
  StringLiteral({node})
  {
    if (node.extra && /\\[ux]/gi.test(node.extra.raw)) {
      node.extra = undefined;
    }
  },
}
traverse(ast, transform_literal);


// let {code} = generator(ast)
// const code = generator(ast,opts = {jsescOption:{"minimal":true}}, js_code);
const {code} = generator(ast,opts = {"comments":false},js_code);
console.log(code)

// How to decode the "a" encrypted text to "b" cleartext
fs.writeFile('decode.js', code, (err)=>{});