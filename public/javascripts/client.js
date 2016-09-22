$(function() {

    var submitQuery = $("#submitQuery");
    var query = {};
    var showLogs = $("#showLogs");
    var showResults  = $("#show");
    var showVisualize = $("#visualize");
    var fileList = $("#fileList");
    var stats;
    var myBarChart;
    showVisualize.hide();
    showResults.hide();

    function updateValues(){
        $.getJSON("/logValues",function(val){
            var numEntries = val.entryValue;
            var numFiles = val.fileValue;
            $("#stats").empty();
            $("#stats").append("<p> There are currently "+ numFiles +" log files with "+ numEntries + " log entries</p>");

        });
    }

    function downloadFile(i) {
        function saveDownloadedFile(fileContents) {
            console.log("Trying to save file");
            console.log(fileContents);
            saveAs(new Blob([fileContents],
                {type: "text/plain;charset=utf-8"}),
                stats[i].name);
            }

            return function() {
                $.post("/downloadFile", {downloadFile: stats[i].name},
                saveDownloadedFile);
            }
        }

    function doUpdateFileList (returnedStats) {
        var i;
        stats = returnedStats;
        fileList.empty();
        for (i=0; i<stats.length; i++) {
            fileList.append('<li> <a id="file' + i + '" href="#">' +
            stats[i].name +
            "</a> (" + stats[i].size + " bytes)");
            $("#file" + i).click(downloadFile(i));
        }
    }

    function updateFileList () {
        updateValues();
        $.getJSON("/getFileStats", doUpdateFileList);
    }

    updateFileList();

    $("#fileuploader").uploadFile({
        url:"/uploadLog",
        fileName:"theFile",
        dragDrop: false,
        uploadStr: "Upload Files",
        afterUploadAll: updateFileList
    });

    function makeChart(theLogs){

        // Return the log stats necessary for
        // the data passed to visualize.jade
        var dateArr = new Array();
        var valueArr = new Array();
        /*total up the amount of logs in a ceratin date*/
        for(var index in theLogs){
            var date = '';
            for(var key in theLogs[index]){
                if(key === "month")
                date += String(theLogs[index][key]);
                if(key === "day")
                date += String(' '+ theLogs[index][key]);
            }

            var indexCheck = dateArr.indexOf(date);
            if(indexCheck === -1){
                dateArr.push(date);
                valueArr[dateArr.indexOf(date)] = 1;
            }
            else
                valueArr[indexCheck]++;
        }

        var data = {
            labels: dateArr,
            datasets: [
                {
                    fillColor: "rgba(151,187,205,0.5)",
                    strokeColor: "rgba(151,187,205,0.8)",
                    highlightFill: "rgba(151,187,205,0.75)",
                    highlightStroke: "rgba(151,187,205,1)",
                    data: valueArr
                }
            ]};


        if (myBarChart){
            myBarChart.destroy();
        }

        var ctx = $("#myChart").get(0).getContext("2d");
        myBarChart = new Chart(ctx).Bar(data, {});
        showVisualize.show();
    }


    function entriesToLines(theLogs) {
        var arrayStore = Array();
        /*go through each object in the database array passed in*/
        for(var object in theLogs){
            var formattedLine = '';

            /*go through each attribute in the object*/
            for(var attribute in theLogs[object]){

                /*if service attribute is found then append a colon to it*/
                if(attribute === "service")
                theLogs[object][attribute] += ':';

                /*exclude the ID attribute from the logs and add everything else*/
                if(attribute !== "_id" && attribute !== "file")
                formattedLine += String(theLogs[object][attribute] + ' ');
            }

            arrayStore.push(formattedLine);
        }
        /*join the array containing the formatted logs and seperate by new lines*/
        arrayStore = arrayStore.join('\n');

        return(arrayStore);
    }

    function doQuery() {
        var fieldValue = $("#queryForm :input[type='text']").fieldValue();
        $("#queryForm :input[type='text']").each(function(index){
            query[$(this).attr("name")] = fieldValue[index];
        });

        query.queryType = $("#queryType").val()
        showResults.hide();
        showVisualize.hide();

        function returnQuery(theLogs) {
            if (query.queryType === 'visualize') {
                makeChart(theLogs);
            }
            else if (query.queryType === 'show') {
                showResults.show();
                showLogs.val(entriesToLines(theLogs));
            }
            else if (query.queryType === 'download') {
                saveAs(new Blob([entriesToLines(theLogs)],
                {type: "text/plain;charset=utf-8"}),
                "logs.log");
            }
            else {
                console.log("ERROR: Unknown query type.  This should never happen.");
            }
        }
        $.post("/doQuery", query, returnQuery);
    }

    submitQuery.click(doQuery);

});
