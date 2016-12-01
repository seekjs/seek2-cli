var fs = require('fs');
var cp = require('child_process');

var setCode = function(code, file, tag){
    var re = new RegExp(`<${tag}.*?>([\\s\\S]+)<\\/${tag}>`,"i");
    code = re.test(code) ? RegExp.$1 : "";
    fs.writeFileSync(file, code);
};

module.exports =  function(args) {
    var js = args.js || "js";
    var css = args.css || "css";
    var tp = args.tp || "templates";
    var page = args.page || "pages";

    [js,css,tp].forEach(x=>{
        var dir = `./${x}`;
        if(fs.existsSync(dir)==false) {
            cp.execSync(`mkdir ${dir}`);
        }
    });

    fs.readdirSync(`./${page}`).forEach(x=> {
        var pageName = x.replace(".sk", "");
        var code = fs.readFileSync(`./${page}/${x}`).toString().trim();
        setCode(code, `./${css}/${pageName}.css`,"style");
        setCode(code, `./${tp}/${pageName}.html`,"template");
        setCode(code, `./${js}/${pageName}.js`,"script");
    });

    console.log("1sp3 success!");
};