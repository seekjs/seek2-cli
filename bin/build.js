var fs = require("fs");
var template = require("./template");
var {log,getArgs,requireJson,cmd} = require('ifun');

var timestamp = Date.now();

var cfg = {
    ns: {},
    alias: {}
};

var cssCode = "";
var jsCode = `
var modules = {};
var require = function (mid) {
    var module = {};
    var exports = module.exports = {};
    return modules[mid] && modules[mid](require, exports, module);
};`;


var rootPath;
var sysPath;
var cssList = [];
var jsList = [];
var imageList = [];


var parseModule = function (mid, code) {
    return `\n\n
    modules["${mid}"] = function(require, exports, module){
        ${code}
        return module.exports;
    };`;
};

var getCode = function(file){
    return fs.readFileSync(file).toString().trim();
};

var getConfig = function(code){
    code = code.replace(/seekjs\.config\(([\s\S]+?)\);/, function(_,json){
        json = new Function(`return ${json}`)();
        Object.assign(cfg, json);
        return "";
    });
    jsCode += parseModule("root.main", code);
};

var getUrl = function(mid){
    for(var k in cfg.alias){
        if(mid==k){
            return cfg.rootPath + cfg.alias[k];
        }
    }
    for(var k in cfg.ns){
        if(mid.startsWith(k)){
            let item = cfg.ns[k];
            let path = item.path || item;
            let ext = item.type || ".js";
            return (k=="sys."?"":cfg.rootPath) + mid.replace(k, path) + ext;
        }
    }
    return `${cfg.sysPath}node/${mid}.js`;
};

var chkModule = function(mid){
    var isExistMid = jsList.some(x=>x.mid==mid) || cssList.some(x=>x.mid==mid);
    if(!isExistMid) {
        var url = getUrl(mid);
        var code = getCode(url);
        code = chkCode(code);

        if (url.endsWith(".css")) {
            cssList.push({mid,url});
            cssCode += code;
        } else {
            jsList.push({mid,url});
            jsCode += parseModule(mid,code);
        }
    }
};

var chkCode = function(code){
    code = code.replace(/require\(\"(.+?)\"\)/g, function(_,mid){
        chkModule(mid);
        return _;
    });
    return chkImage(code);
};

var imgIndex = 0;
var parseImage = function(imageName, imageExt){
    var srcImage = `${imageName}.${imageExt}`;
    srcImage = cfg.rootPath + "/" + srcImage.replace("../","");
    var item = imageList.filter(x=>srcImage==x.srcImage)[0];
    var newImage;
    if(item){
        newImage = item.newImage;
    }else {
        var sn = ++imgIndex;
        newImage = `${sn}.${imageExt}`;
        imageList.push({srcImage, newImage});
    }
    return newImage;
};

var chkImage = function(code){
    code = code.replace(/(src|href)=["']?(.+?)\.(png|jpg|gif|ico|bmp)["']?/g, function(_,p,imageName,imageExt){
        var newImage = parseImage(imageName, imageExt);
        return `${p}="${newImage}?${timestamp}"`;
    });
    code = code.replace(/url\(["']?(.+?)\.(png|jpg|gif|ico|bmp)["']?\)/g, function(_,imageName, imageExt){
        var newImage = parseImage(imageName, imageExt);
        return `url("${newImage}?${timestamp}")`;
    });
    return code;
};

var saveImage = function(item){
    cmd(`cp ${item.srcImage} ${cfg.rootPath}/dist/${item.newImage}`);
};

var chkSkPage = function(page, file){
    var code = getCode(file);
    code = chkCode(code);
    var _jsCode = /<script.*?>([\s\S]+?)<\/script>/.test(code) ? RegExp.$1 : "";
    var tpCode = /<template.*?>([\s\S]+?)<\/template>/.test(code) ? RegExp.$1 : "";
    var _cssCode = /<style.*?>([\s\S]+?)<\/style>/.test(code) ? RegExp.$1 : "";
    tpCode = template.getJsCode(tpCode);
    tpCode =
    _jsCode = `
    exports.getHTML = function($){
        ${tpCode}
    };
    ${_jsCode}`;
    jsCode += parseModule(`page.${page}`, _jsCode);
    cssCode += `\n\n${_cssCode}`;
};

var saveFile = function(file, code){
    fs.writeFileSync(file, code);
};

module.exports =  function(){
    var args = getArgs("cmd");
    cfg.rootPath = args.dir || process.cwd();
    cfg.sysPath = args.sysPath;
    Object.assign(cfg, requireJson(`${cfg.rootPath}/seek.config.js`));
    Object.assign(cfg, args);
    cfg.entryFile = `${cfg.rootPath}/main.js`;
    var entryContent = getCode(cfg.entryFile);
    getConfig(entryContent);
    cfg.ns["sys."] = args.sysPath;
    cfg.ns["root."] = cfg.rootPath;
    chkCode(entryContent);
    var pagesPath = `${cfg.rootPath}/pages`;
    fs.readdirSync(pagesPath).forEach(page => {
        chkSkPage(page.replace(".sk",""), `${pagesPath}/${page}`);
    });
    jsCode += `\n\n
    window.onload = function(){
        require("root.main");
    }`;

    var indexCode = getCode(`${cfg.rootPath}/index.html`).replace("node_modules/seekjs/module.js",`app.js?${timestamp}`);
    indexCode = indexCode.replace('</head>', `<link rel="stylesheet" href="app.css?${timestamp}" type="text/css" />`);
    indexCode = chkImage(indexCode);

    log({cfg, cssList, jsList, imageList});

    var distDir = `${cfg.rootPath}/dist`;
    if(fs.existsSync(distDir)){
        cmd(`rm -rf ${distDir}`);
    }
    cmd(`mkdir ${distDir}`);
    var appJs = `${distDir}/app.js`;
    saveFile(appJs, jsCode);
    saveFile(`${distDir}/app.css`, cssCode);
    saveFile(`${distDir}/index.html`, indexCode);
    imageList.forEach(saveImage);
    cmd(`babel ${appJs} -o ${appJs} --compact=true --presets=latest`);
    cmd(`uglifyjs ${appJs} -o ${appJs}`);
    log("generate success!");
};