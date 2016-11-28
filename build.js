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

var getCode = function(file){
    return fs.readFileSync(file).toString().trim();
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

var chkModule = function(mid){
    var isExistMid = jsList.some(x=>x.mid==mid) || cssList.some(x=>x.mid==mid);
    if(!isExistMid) {
        var url = seekjs.getPath(mid);
        if(url.endsWith(".sk")) {
            return chkSkPage(mid, url);
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
    code = code.replace(/(?:require|usePlugin)\(["'](.+?)["']\s*[),]/g, function(_,mid){
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

var chkSkPage = function(mid, file){
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
    jsCode += parseModule(mid, _jsCode);
    cssCode += `\n\n${_cssCode}`;
};

var saveFile = function(file, code){
    fs.writeFileSync(file, code);
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
    var pagePath = `${rootPath}/pages`;
    fs.readdirSync(pagePath).forEach(page => {
        chkSkPage("page." + page.replace(".sk",""), `${pagePath}/${page}`);
    });
    (cfg.extraModules||[]).forEach(chkModule);
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