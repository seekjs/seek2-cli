var fs = require('fs');
var cp = require('child_process');

var getCode = function(file, tag, prop){
    var code = fs.readFileSync(file).toString().trim();
    prop = prop || "";
    return `<${tag+prop}>\n${code}\n</${tag}>\n\n`;
};

module.exports =  function(args) {
    var js = args.js || "js";
    var css = args.css || "css";
    var tp = args.tp || "templates";
    var page = args.page || "pages";
    var pageDir = `./${page}`;

    if(fs.existsSync(pageDir)==false){
        cp.execSync(`mkdir ${pageDir}`);
    }

    fs.readdirSync(`./${js}`).forEach(x=> {
        var pageName = x.replace(".js", "");
        var code = getCode(`./${css}/${pageName}.css`,"style") +
                   getCode(`./${tp}/${pageName}.html`,"template") +
                   getCode(`./${js}/${pageName}.js`,"script",`type="text/ecmascript-6"`);
        fs.writeFileSync(`${pageDir}/${pageName}.sk`, code);
    });

    console.log("3in1 success!");
};