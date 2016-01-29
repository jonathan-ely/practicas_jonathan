var fs = require('fs');
var path = require('path');

var filename,
    cutout,
    group,
    layer,
    SCREENSHOTS = {};

var walkDir = function (directoryName) {
    'use strict';

    var files = fs.readdirSync(directoryName),
        wallet,
        check;

    var walkFile = function (i) {

        if (i < files.length) {
            filename = files[i];

            check = countFolder(directoryName);

            if(check === 5){

                group = folderData(directoryName, 2);
                layer = folderData(directoryName, 3);
                wallet = folderData(directoryName, 4);

                if(typeof SCREENSHOTS[group] === 'undefined')
                    SCREENSHOTS[group] = {};

                if(typeof SCREENSHOTS[group][layer] === 'undefined')
                    SCREENSHOTS[group][layer] = {};

                if(typeof SCREENSHOTS[group][layer][wallet] === 'undefined')
                    SCREENSHOTS[group][layer][wallet] = {};

                if(typeof SCREENSHOTS[group][layer][wallet].name === 'undefined')
                    SCREENSHOTS[group][layer][wallet].name = wallet;

                if(typeof SCREENSHOTS[group][layer][wallet].screenshots === 'undefined')
                    SCREENSHOTS[group][layer][wallet].screenshots = {};
            }
            
            var fullPath = path.join(directoryName, filename);
            var file = fs.statSync(fullPath);
            if (file.isDirectory()) {
                walkDir(fullPath);
                walkFile(++i);
            } else {
                if (fullPath.indexOf(".jpg") > -1 || fullPath.indexOf(".jpeg") > -1 || fullPath.indexOf(".png") > -1) {
                    if(check === 5)
                        AddScreenshots(fullPath, wallet, directoryName);
                }
                walkFile(++i);
            }
        }
    };
    walkFile(0);
};

var root = 'images\\wallet_screenshots';

walkDir(root);

var imagesStr = JSON.stringify(SCREENSHOTS);

fs.writeFile('json/screenshots.json', imagesStr, {
    flags: 'w'
}, function (err) {
    'use strict';
    if (err) {

    }
});

function countFolder(directoryName){

    var directory,
        cantFolder;

    directory = directoryName.split("\\");
    cantFolder = directory.length;

    return cantFolder;
}

function folderData(directoryName, data){
    directory = directoryName.split("\\");

    return directory[data];
}

function AddScreenshots(fullPath, wallet, directoryName){

    var src,
        num;

    src = fullPath.replace('\\', '/');
    src = src.replace('\\', '/');
    src = src.replace('\\', '/');
    src = src.replace('\\', '/');
    src = src.replace('\\', '/');

    num = fullPath.replace(directoryName+"\\", '');
    num = num.replace(".png", '');
    SCREENSHOTS[group][layer][wallet].screenshots['Screenshots_'+num] = src;
}