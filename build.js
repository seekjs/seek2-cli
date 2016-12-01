var fs = require("fs");
var {log,getArgs,requireJson,cmd} = require('ifun');
var template;

var timestamp = Date.now();

var cfg = {};
var cssCode = "";
var jsCode = `
var log = function(...args){
    console.log.apply(console, args);
};
var modules = {};
var run_modules = {};
var require = function (mid, iniExports) {
    if(!run_modules[mid] && modules[mid] || mid.startsWith("page.") || mid.startsWith("seekjs-plugin-") ){
        modules[mid].mid = mid;
        if(typeof modules[mid]=="object"){
            run_modules[mid] = modules[mid];
        }else{
            var module = {};
            var exports = module.exports = iniExports || {};
            run_modules[mid] = modules[mid](require, exports, module);
        }
    }
    return run_modules[mid];
};`;


var rootPath;
var sysPath;
var cssList = [];
var jsList = [];
var imageList = [];


var parseModule = function (mid, code) {
    if(mid.endsWith(".json")){
        return `modules["${mid}"] = ${code};`;
    }
    return `\n\n
    modules["${mid}"] = function(require, exports, module, __dirname, __filename){
        ${code}
        return module.exports;
    };`;
};

var getConfig = function(code){
    code = code.replace(/seekjs\.config\(([\s\S]+?)\);/, function(_,jsonStr){
        var json = seekjs.getJson(jsonStr);
        seekjs.config(json);
        //Object.assign(cfg, json);
        return "";
    });
    jsCode += parseModule("root.main", code);
};

var chkModule = function(mid, isPlugin){
    var isExistMid = jsList.some(x=>x.mid==mid) || cssList.some(x=>x.mid==mid);
    if(!isExistMid) {
        var url = seekjs.getPath(mid);
        if(isPlugin) {
            if (url.endsWith(".sk")) {
                chkSkPage(mid, url);
            }else{
                var ops = {
                    mid,
                    jsCode: seekjs.getCode(url),
                    cssCode: seekjs.getCode(url.replace(/\.js/,".css")),
                    tpCode: seekjs.getCode(url.replace(/\.js/,".html"))
                };
                chkPage(ops);
            }
            return;
        }

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
    code = code.replace(/(require|usePlugin)\(["'](.+?)["']\s*[),]/g, function(_,key,mid){
        chkModule(mid, key=="usePlugin");
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

var chkPage = function(mid){
    var skFile = seekjs.getPath(mid);
    var _jsCode;
    var _cssCode;
    var _tpCode;
    if(skFile.endsWith(".sk")){
        var code = seekjs.getcode(skFile);
        _cssCode = /<style.*?>([\s\S]+?)<\/style>/.test(code) ? RegExp.$1 : "";
        _tpCode = /<template.*?>([\s\S]+?)<\/template>/.test(code) ? RegExp.$1 : "";
        _jsCode = /<script.*?>([\s\S]+?)<\/script>/.test(code) ? RegExp.$1 : "";
    }else{
        var jsFile = skFile;
        var cssFile;
        var tpFile;
        if(mid.startsWith("seekjs-plugin-")){
            cssFile = jsFile.replace(/\.js/, ".css");
            tpFile = jsFile.replace(/\.js/, ".html");
        }else{
            cssFile = seekjs.getPath(mid.replace("js.","css."));
            tpFile = seekjs.getPath(mid.replace("js.","tp."));
        }
        _cssCode = seekjs.getCode(cssFile);
        _tpCode = seekjs.getCode(tpFile);
        _jsCode = seekjs.getCode(jsFile);
    }

    chkCode(_jsCode);
    _tpCode = template.getJsCode(_tpCode);
    _jsCode = `
    exports.getHTML = function($){
        ${_tpCode}
    };
    ${_jsCode}`;
    jsCode += parseModule(mid, _jsCode);
    cssCode += `\n\n${_cssCode}`;
};

var saveFile = function(file, code){
    fs.writeFileSync(file, code);
};

var getCode = function(file){
    return fs.readFileSync(file).toString().trim();
};

module.exports =  function(){
    var args = getArgs("cmd");
    rootPath = cfg.rootPath = args.dir || process.cwd() + "/";
    var indexCode = getCode(`${rootPath}/index.html`).replace(/src\s*=\s*["'](.+?)\/module\.js["']/, (_, _sysPath)=>{
        sysPath = cfg.sysPath = args.sysPath || `${rootPath}/${_sysPath}/`;
        return `src="app.js?${timestamp}"`;
    });
    template = require(`${sysPath}/template`);
    require(`${sysPath}/module`).init({
        rootPath: cfg.rootPath,
        sysPath: cfg.sysPath,
        getCode: getCode
    });

    var seekConfig = requireJson(`${rootPath}/seekjs.config.js`);
    if(typeof seekConfig=="function"){
        seekConfig = seekConfig(args);
    }
    Object.assign(cfg, seekConfig);
    Object.assign(cfg, args);
    cfg.entryFile = `${cfg.rootPath}/main.js`;
    var entryContent = getCode(cfg.entryFile);
    getConfig(entryContent);
    chkCode(entryContent);

    log({cfg});
    var dir = cfg.page || cfg.js;
    var ns = cfg.page ? "page." : "js.";
    var ext = cfg.page ? ".sk" : ".js";
    fs.readdirSync(dir).forEach(page => {
        if(page.endsWith(ext)) {
            let mid = ns + page.replace(ext, "");
            chkPage(mid);
        }
    });

    (cfg.extraModules||[]).forEach(x=>chkModule(x));
    jsCode += `\n\n
    window.onload = function(){
        require("root.main");
    }`;
    if(!args.noBabel) {
        jsCode = require('babel-core').transform(jsCode, {
            presets: [require('babel-preset-latest')],
            compact: true
        }).code;
    }
    if(!args.noUglify) {
        jsCode = require("uglify-js").minify(jsCode, {
            mangle: false,
            fromString: true
        }).code;
    }
    indexCode = indexCode.replace('</head>', `<link rel="stylesheet" href="app.css?${timestamp}" type="text/css" />`);
    indexCode = chkImage(indexCode);

    log({cfg, cssList, jsList, imageList});

    var distPath = `${cfg.rootPath}/dist`;
    if(fs.existsSync(distPath)){
        cmd(`rm -rf ${distPath}`);
    }
    cmd(`mkdir ${distPath}`);
    var appJs = `${distPath}/app.js`;
    saveFile(appJs, jsCode);
    saveFile(`${distPath}/app.css`, cssCode);
    saveFile(`${distPath}/index.html`, indexCode);
    imageList.forEach(saveImage);
    //cmd(`babel ${appJs} -o ${appJs} --compact=true --presets=latest`);
    //cmd(`uglifyjs ${appJs} -o ${appJs}`);
    log("generate success!");
};