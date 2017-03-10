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
    if(!run_modules[mid] && modules[mid] || /^page\.|^seekjs\-plugin\-/.test(mid) ){
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
var distPath;
var appNs = {};
var cssList = [];
var jsList = [];
var pageList = [];
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
    code = code.replace(/app\.config\(([\s\S]+?)\);/, function(_,jsonStr){
        var json = seekjs.getJson(jsonStr);
        getAppConfig(json);
        return "";
    });

    return parseModule("root.main", code);
};

//配置信息
var getAppConfig = function (_cfg) {
    appNs = {};
    var typeList = {js:".js", css:".css", tp:".html", page:".sk"};
    for(let k in _cfg){
        if(/^(page|js|css|tp)$/.test(k)){
            appNs[k] = {
                path: _cfg[k],
                type: typeList[k]
            }
        }
    }
    seekjs.config({ns: appNs});
};

var chkModule = function(mid, isPlugin){
    var isJs = jsList.some(x=>x.mid==mid);
    var isCss = cssList.some(x=>x.mid==mid);
    if(!isJs && !isCss) {
        if(isPlugin) {
            return chkPage(mid);
        }
        var url = seekjs.getPath(mid);
        log({url});
        var code = getCode(url);
        code = chkCode(code);

        if (url.endsWith(".css")) {
            cssList.push({mid,url});
            cssCode += code;
            isCss = true;
        } else {
            jsList.push({mid,url});
            jsCode += parseModule(mid,code);
        }
    }
    log({mid,isCss})
    return isCss;
};

var chkCode = function(code){
    code = code.replace(/require\(["'](.+?)["']\);?/g, function(_,mid){
        return chkModule(mid) ? "" : _;
    });
    code = code.replace(/usePlugin\(["'](.+?)["']\s*[),]/g, function(_,mid){
        chkModule(mid, true);
        return _;
    });
    return chkImage(code);
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
    code = code.replace(/["']?(.+?)\.(png|jpg|gif|ico|bmp)["']?/g, function(_,imageName, imageExt){
        var newImage = parseImage(imageName, imageExt);
        return `"${newImage}?${timestamp}"`;
    });
    code = code.replace()
    return code;
};

var imgIndex = 0;
var parseImage = function(imageName, imageExt){
    var srcImage = `${imageName}.${imageExt}`;
    srcImage = rootPath + "/" + srcImage.replace("../","");
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

var saveImage = function(item){
    cmd(`cp ${item.srcImage} ${distPath}/${item.newImage}`);
};

var chkPage = function(mid){
    var skFile = seekjs.getPath(mid);
    var _jsCode;
    var _cssCode;
    var _tpCode;
    if(skFile.endsWith(".sk")){
        var code = seekjs.getCode(skFile);
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
            cssFile = appNs.css && seekjs.getPath(mid.replace("js.","css."));  //从appNs.css拿可能更好,先这样吧
            tpFile = appNs.tp && seekjs.getPath(mid.replace("js.","tp."));   //从appNs.tp拿可能更好,先这样吧
        }
        _cssCode = cssFile ? seekjs.getCode(cssFile) : "";
        _tpCode = tpFile ? seekjs.getCode(tpFile) : "";
        _jsCode = seekjs.getCode(jsFile);
    }

    _jsCode = chkCode(_jsCode);
    _tpCode = chkCode(_tpCode);
    _cssCode = chkCode(_cssCode);

    _tpCode = template.getJsCode(_tpCode);
    _jsCode = `
    exports.getHTML = function($){
        ${_tpCode}
    };
    ${_jsCode}`;
    mid = mid.replace("js.", "page.");
    jsCode += parseModule(mid, _jsCode);
    cssCode += `\n\n${_cssCode}`;
    pageList.push({mid,jsFile,cssFile,tpFile});
};

var saveFile = function(file, code){
    fs.writeFileSync(file, code);
};

var getCode = function(file){
    return fs.readFileSync(file).toString().trim();
};

module.exports =  function(){
    var args = getArgs("cmd");
    rootPath = cfg.rootPath = args.dir || process.cwd();
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
    distPath = cfg.distPath = cfg.distPath || `${rootPath}/dist`;
    cfg.entryFile = `${rootPath}/main.js`;
    var entryContent = getCode(cfg.entryFile);
    entryContent = getConfig(entryContent);
    log({ns:seekjs.ns})
    entryContent = chkCode(entryContent);
    jsCode += entryContent;

    var dir = seekjs.ns.page ? seekjs.ns.page.path : seekjs.ns.js.path;
    var ns = seekjs.ns.page ? "page." : "js.";
    var ext = seekjs.ns.page ? ".sk" : ".js";
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
    //jsCode='x=>alert(x);';
    if(!args.noBabel) {
        jsCode = require('babel-core').transform(jsCode, {
            presets: [
                //require('babel-preset-es2015'),
                require('babel-preset-latest')
            ],
            plugins:[
                // 先注掉,es6新函数用babel-polyfill解决, 不用webpack的话 transform-runtime貌似不起作用
                //require('babel-plugin-transform-runtime')
                //require('babel-plugin-transform-object-assign'),
                //require('babel-plugin-transform-array-from')
            ],
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

    log({cfg, cssList, jsList, pageList, imageList});

    if(fs.existsSync(distPath)){
       // cmd(`rm -rf ${distPath}`);
    }
    //cmd(`mkdir ${distPath}`);
    var appJs = `${distPath}/app.js`;
    saveFile(appJs, jsCode);
    saveFile(`${distPath}/app.css`, cssCode);
    saveFile(`${distPath}/index.html`, indexCode);
    imageList.forEach(saveImage);
    //cmd(`babel ${appJs} -o ${appJs} --compact=true --presets=latest`);
    //cmd(`uglifyjs ${appJs} -o ${appJs}`);
    log("generate success!");
};