/**
 * Created by likaituan on 15/8/9.
 */

seekjs.config({
    ns:{
        "js.": "/js/",
        "css.": {
            path: "/css/",
            type: ".css"
        }
    }
});

require("css.tag");
require("css.class");

var app = require("sys.app");

app.addView(require("js.view"));
app.addPipe(require("js.pipe"));

app.config({
    path: `/pages/`
});

app.init("home");
