var  {getArgs, getCode, setCode} = require("ifun");

//导出插件
module.exports = function(ua){
    var {name} = getArgs("cmd", "name");
    var pkFile = `${ua.rootPath}/node_modules/seekjs-plugin-${name}/package.json`;
    var pk = require(pkFile);
    var file = `${ua.rootPath}/node_modules/seekjs-plugin-${name}/${pk.main}`;
    var jsCode = getCode(file);




    log({name,file,ua,jsCode});
};