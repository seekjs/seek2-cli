#!/usr/bin/env node


var fs = require("fs");
var path = require("path");
var {getArgs,log,end,cmd,requireJson} = require("ifun");
var {name,version} = require("./package.json");

var args = getArgs("cmd");
var ua = {};
ua.rootPath = args.dir || process.cwd();
var skPath = __dirname;
ua.engine = {name,version};
ua.user = process.env.USER || process.env.USERNAME;
ua.sudo = process.platform!="win32"&&ua.user!="root" ? "sudo " : "";
ua.npm = process.platform=="win32" ? "npm.cmd" : "npm";

exports["3in1"] = require("./3in1");
exports.create = require("./create");
exports.build = require("./build");

exports.init = function(){
    exports.create("init");
};


//更新
exports.update = function(ua){
    args = getArgs("cmd", "version");
    log("now is updating, please wait a moment...");
    var cmdExp = `${ua.sudo}${ua.npm} install -g ${ua.engine.name}`;
    if(args.version){
        cmdExp += `@${args.version}`;
    }
    cmd(cmdExp);
};

//查看seekjs版本
if(args.v){
    log(pk.version);
}else if(args.cmd){
    args.cmd = args.cmd.toLowerCase();
    if(exports[args.cmd]){
        exports[args.cmd](ua);
    } else {
        log(`sorry, no such command '${args.cmd}'!`);
    }
} else {
    log(`welcome to use seekjs-cli,\n seekjs-cli current version is ${pk.version}!`);
}