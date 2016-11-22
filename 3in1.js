var fs = require('fs');
var cp = require('child_process');

module.exports =  function() {
    var dir = "./pages";
    if(fs.existsSync(dir)){
        cp.execSync(`rm -rf ${dir}`)
    }
    cp.execSync(`mkdir ${dir}`);

    fs.readdirSync("./js").forEach(x=> {
        var name = x.replace(".js", "");
        var jsCode = fs.readFileSync("./js/" + name + ".js");
        var cssCode = fs.readFileSync("./styles/" + name + ".css");
        var htmlCode = fs.readFileSync("./templates/" + name + ".html");
        var code = "";
        if (cssCode) {
            code += `<style>\n${cssCode}\n</style>`;
        }
        if (htmlCode) {
            if (code) code += "\n\n";
            code += `<template>\n${htmlCode}\n</template>`;
        }
        if (jsCode) {
            if (code) code += "\n\n";
            code += `<script type="text/ecmascript-6">\n${jsCode}\n</script>`;
        }
        fs.writeFileSync("./pages/" + name + ".sk", code);
    });

    console.log("generate success!");
};