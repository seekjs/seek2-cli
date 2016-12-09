var  {getArgs, getCode, setCode} = require("ifun");
var template = require("sys.template");

//导出插件
module.exports = function(ua){
    var {name} = getArgs("cmd", "name");
    var fullName = `seekjs-plugin-${name}`;
    var dir = `${ua.rootPath}/node_modules/${fullName}`;
    var pkFile = `${dir}/package.json`;
    var pk = require(pkFile);
    var tpCode = getCode(`${dir}/`);
    var jsCode = getCode(`${dir}/${pk.main}`);
    jsCode += template.getJsCode(tpCode);
    setCode(`${fullName}.js`, jsCode);


    log({ua,name,file});
};