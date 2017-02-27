#!/usr/bin/env node

global.log = function(...args){
    console.log.apply(console, args);
};

var fs = require("fs");
var {getArgs,cmd,requireJson} = require("ifun");
var {name,version} = require("./package.json");

var args = getArgs("cmd");
var ua = {};
    ua.rootPath = args.dir || process.cwd();
    ua.cliPath = __dirname;
    ua.engine = {name,version};
    ua.user = process.env.USER || process.env.USERNAME;
    ua.sudo = process.platform!="win32"&&ua.user!="root" ? "sudo " : "";
    ua.npm = process.platform=="win32" ? "npm.cmd" : "npm";

var cmdList = require("./cmdList");
cmdList.init(ua);
Object.assign(cmdList,{
    create: require("./create"),
    build: require("./build"),
    "export-plugin": require("./export-plugin"),
    "3in1": require("./3in1"),
    "1sp3": require("./1sp3")
});

//查看seekjs版本
if(args.v){
    log(`seekjs-cli: ${version}`);
    var json = requireJson(`${__dirname}/node_modules/seekjs/package.json`);
    json.version && log(`seekjs: ${json.version}`);
}else if(args.cmd){
    args.cmd = args.cmd.toLowerCase();
    if(cmdList[args.cmd]){
        cmdList[args.cmd](ua);
    } else {
        log(`sorry, no such command '${args.cmd}'!`);
    }
} else {
    log(`welcome to use seekjs-cli,\n seekjs-cli current version is ${version}!`);
}