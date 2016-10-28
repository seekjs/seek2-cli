/**
 * Created by likaituan on 16/10/19.
 */

//转驼峰
exports.camel = function(str){
    return str.replace(/\-(\w)/g,(_,letter) => {
        return letter.toUpperCase();
    });
};