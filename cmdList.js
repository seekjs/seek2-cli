var {getArgs,log,cmd} = require("ifun");
var fs = require("fs");

exports.init = function(ua){
    var mPath = `${ua.cliPath}/node_modules`;
    if(!fs.existsSync(mPath)){
        cmd(`mkdir ${mPath}`);
    }
    if(!fs.existsSync(`${mPath}/sys.seek.js`)){
        var smPath = `${ua.cliPath}/sys_modules`;
        fs.readdirSync(smPath).forEach(x=>{
            cmd(`${ua.sudo}cp ${smPath}/${x} ${mPath}/${x}`);
        });
    }
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
    var args = getArgs("cmd", "view");
    getJson(ua).forEach(item => {
        if(item.path){
            cmd(`touch ${item.path}/${args.view+item.type}`);
        }
    });
};

//delete View
exports.del = function (ua) {
    var args = getArgs("cmd", "view");
    getJson(ua).forEach(item => {
        if(item.path){
            cmd(`rm ${item.path}/${args.view+item.type}`);
        }
    });
};

//edit View
exports.edit = function (ua) {
    var args = getArgs("cmd", "view");
    getJson(ua).forEach(item => {
        if(item.path){
            cmd(`node /tools/edit.js ${item.path}/${args.view+item.type}`);
        }
    });
};

//rename View
exports.rename = function(ua){
    var args = getArgs("cmd", "oldView", "newView");
    var hasView = false;
    getJson(ua).forEach(item => {
        if(item.path){
            var srcFile = `${item.path}/${args.oldView+item.type}`;
            if(fs.existsSync(srcFile)){
                hasView = true;
                cmd(`mv ${srcFile} ${item.path}/${args.newView+item.type}`);
                log(`rename ${args.oldView+item.type} to ${args.newView+item.type} success!`);
            }
        }
    });
    if(!hasView){
        log(`sorry, the view "${args.oldView}" is no exist!`);
    }
};

//copy View
exports.copy = function(ua){
    var args = getArgs("cmd", "srcView", "newView");
    var hasView = false;
    getJson(ua).forEach(item => {
        if(item.path){
            var srcFile = `${item.path}/${args.srcView+item.type}`;
            if(fs.existsSync(srcFile)){
                hasView = true;
                cmd(`cp ${srcFile} ${item.path}/${args.newView+item.type}`);
                log(`copy ${args.srcView+item.type} to ${args.newView+item.type} success!`);
            }
        }
    });
    if(!hasView){
        log(`sorry, the view "${args.srcView}" is no exist!`);
    }
};