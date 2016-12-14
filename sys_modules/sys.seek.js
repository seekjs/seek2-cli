module.exports = function(mid){
    mid = mid.replace(/^.+?sys\.(\w+)\.js$/, "$1");
    return require(`seekjs/${mid}.js`);
};