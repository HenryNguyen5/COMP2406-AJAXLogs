/*Assignment 6*/
/*analyzeLogs.js*/
/*Student Number: 100968253*/
/*Name: Henry Nguyen*/

/*References:*/
/*https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toUpperCase*/
/*http://stackoverflow.com/questions/8293363/passing-an-array-to-a-json-object-for-jade-rendering*/
/*http://stackoverflow.com/questions/17039018/how-to-use-a-variable-as-a-field-name-in-mongodb-native-findone*/
/*https://developer.mozilla.org/en-US/docs/Web/CSS/position#Values*/
/*http://malsup.com/jquery/form/#api*/
/*http://malsup.com/jquery/form/#options-object*/
/*Collaborators:*/
/*Mike Smith*/


var express = require('express');
var router = express.Router();
var ObjectId = require('mongodb').ObjectID;
var mc = require('mongodb').MongoClient;
var numEntries;
var multer  = require('multer')
var storage = multer.memoryStorage()
var upload = multer({ storage: storage })
var logsCollection, filesCollection;



router.get('/', function(req, res) {
    res.render('index', {title: 'COMP 2406 Log Analysis & Visualization',
});

});

function getLogs(query, returnQuery) {
    /*generate a object to parse the database with*/
    var queryObject = {};

    for(var keys in query){
        if(query[keys] != '' && keys != 'queryType' )
        queryObject[keys] = new RegExp(query[keys]);
    }
    logs = logsCollection.find(queryObject);

    /*return the array of legs to returnQuery*/
    logs.toArray(
        function(err,arr){
            returnQuery(arr);
        });
}

var connectCallback = function(err, db) {
    if (err) {
        throw err;
    }

    filesCollection = db.collection('files');
    logsCollection =  db.collection('logs');
}
/*connect to mongo database*/
mc.connect('mongodb://localhost/log-demo', connectCallback);


function doQuery(req, res) {

    var query = req.body;
    function returnQuery(theLogs){
        res.send(theLogs);
    }
    getLogs(query,returnQuery);
}

router.get('/getFileStats', function(req, res) {
    function returnStats(err, stats) {
        if (err) {
            console.log(err);
            sendStatus(500);
        } else {
            res.send(stats);
        }
    }

    filesCollection.find({},{content: 0})
    .toArray(returnStats);
});

function uploadLog(req, res){
    var storedFile;
    var theFile = req.file;

    function returnResult(err, result) {
        if (err) {
            res.sendStatus(500);
        } else {
            res.send("Upload succeeded: " + storedFile.name + "\n");
        }
    }

    if (theFile) {
        var data = theFile.buffer.toString();
        var lines = data.split('\n');
        var entries = [];

        var i, j, entry, field;
        for (i=0; i<lines.length-1; i++) {
            if (lines[i] && lines[i] !== '') {
                field = lines[i].split(' ');
                entry = {};
                j = 0;
                while (j < field.length) {
                    if (field[j] === "") {
                        field.splice(j, 1);
                    }
                    else {
                        j++;
                    }
                }
                /*with the exception of splitting up date into month and day, and adding a file name*/
                entry.month = field[0];
                entry.day = field[1];
                entry.time = field[2];
                entry.host = field[3];
                entry.service = field[4].slice(0,-1);
                entry.message = field.slice(5).join(' ');
                entry.file = theFile.originalname;
                entries.push(entry);
            }
        }
        /*gather the amount of logs in the database*/
        filesCollection.find({name: theFile.originalname}).toArray(
            function(err,arr){
                if(arr.length === 0 )
                logsCollection.insert(entries);
            });

        storedFile = {
            name: theFile.originalname,
            size: theFile.size,
            content: theFile.buffer.toString('utf8')
        };
        filesCollection.update({name: theFile.originalname},
            storedFile,
            {upsert: true},
            returnResult);
    }

    else {
        res.sendStatus(403);
    }
}


router.post("/downloadFile", function (req, res) {
    var name = req.body.downloadFile;

    function returnFile(err, theFile) {
        if (err) {
            res.send("File not found");
        } else {
            res.type('text/plain');
            res.send(theFile.content);
        }
    }

    filesCollection.findOne({name: name},
        returnFile);
});

/*small function for dropping the DB*/
function dropDB(req, res){
    logsCollection.drop();
    filesCollection.drop();
    entryCount = 0;
    fileCount = 0;
    res.redirect('/');
}

router.post('/doQuery', doQuery);
router.post('/uploadLog',upload.single('theFile'), uploadLog);
router.get('/dropDB', dropDB);
router.get('/logValues', function(req,res){
    logsCollection.count({}, function(err, entryCount){
        filesCollection.count({}, function(err, fileCount){
            res.send({fileValue: fileCount, entryValue: entryCount});
        });

    });
});

module.exports = router;
