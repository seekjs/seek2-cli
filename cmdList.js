var {getArgs,log,cmd} = require("ifun");
var fs = require("fs");

exports.init = function(){
    exports.create("init");
};

//更新
exports.update = function(ua){
    var args = getArgs("cmd", "version");
    log("now is updating, please wait a moment...");
    var cmdExp = `${ua.sudo}${ua.npm} install -g ${ua.engine.name}`;
    if(args.version){
        cmdExp += `@${args.version}`;
    }
    cmd(cmdExp);
};

var getJson = function (ua) {
    var skPath = `${ua.rootPath}/pages`;
    var jsPath = `${ua.rootPath}/js`;
    var tpPath = `${ua.rootPath}/templates`;
    var cssPath = `${ua.rootPath}/css`;
    return [
        {path: fs.existsSync(skPath)&&skPath, type:".sk"},
        {path: fs.existsSync(jsPath)&&jsPath, type:".js"},
        {path: fs.existsSync(tpPath)&&tpPath, type:".html"},
        {path: fs.existsSync(cssPath)&&cssPath, type:".css"}
    ];
};

//add View
exports.add = function (ua) {
    var args = getArgs("cmd","act","view");
    getJson(ua).forEach(item => {
        if(item.path){
            cmd(`touch ${item.path}/${view+item.type}`);
        }
    });
};

//delete View
exports.del = function (ua) {
    var args = getArgs("cmd","act","view");
    getJson(ua).forEach(item => {
        if(item.path){
            cmd(`rm ${item.path}/${view+item.type}`);
        }
    });
};

//rename View
exports.rename = function(ua){
    var args = getArgs("cmd","act","oldView", "newView");
    getJson(ua).forEach(item => {
        if(item.path){
            cmd(`mv ${item.path}/${oldView+item.type} ${item.path}/${newView+item.type}`);
        }
    });
};