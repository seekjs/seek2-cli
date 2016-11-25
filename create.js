var {getArgs,cmd,log,end} = require("ifun");

//新建seek项目
module.exports = function(ops){
    var args = getArgs("cmd", "project");

    if(args.project) {
        var type = args.type || "base";
        var projectDir = `${ops.rootPath}/${args.project}`;
        if(type=="lite") {
            cmd(`git clone git@github.com:seekjs-framework/seekjs-demo-lite.git ${projectDir}`);
        }else if(type=="base"){
            cmd(`git clone git@github.com:seekjs-framework/seekjs-demo.git ${projectDir}`);
        }else if(type=="group"){
            cmd(`git clone git@github.com:seekjs-framework/seekjs-demo-group.git ${projectDir}`);
        }else{
            end(`seekjs demo project not this type: "${type}"`);
        }
        cmd(`npm install`, projectDir);
        log("good, project create success!");
        (args.o&&args.open) && cmd(`open ${projectDir}/index.html`);
    }else{
        log("please enter your project name before!");
    }
}