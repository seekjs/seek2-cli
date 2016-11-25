#!/usr/bin/env node


var fs = require("fs");
var path = require("path");
var {getArgs,log,end,cmd,requireJson} = require("ifun");
var pk = require("./package.json");

var args = getArgs("cmd");
var ops = {};
ops.rootPath = args.dir || process.cwd();
var skPath = __dirname;

exports["3in1"] = require("./3in1");
exports.create = require("./create");
exports.build = require("./build");

exports.init = function(){
    exports.create("init");
};

//更新脚手架
exports.up = exports.update = function(){
    log("now is updating, please wait a moment...");
    cp.exec(`${prefix}npm update -g seek-cli`, function callback(error, stdout, stderr) {
        log(stdout);
    });
};

//重新安装脚手架
exports.install = function(){
    log("now is reinstalling, please wait a moment...");
    cp.exec(`${prefix}npm install -g seek-cli`, function callback(error, stdout, stderr) {
        log(stdout);
    });
};

//查看seekjs版本
if(args.v){
    log(pk.version);
}else if(args.cmd){
    args.cmd = args.cmd.toLowerCase();
    if(exports[args.cmd]){
        exports[args.cmd](ops);
    } else {
        log(`sorry, no such command '${args.cmd}'!`);
    }
} else {
    log(`welcome to use seekjs,\n seekjs current version is ${pk.version}!`);
}