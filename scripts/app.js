/* Exclude Unwanted Jobs by Name */

var blacklistedJobs = [ "LinnRecords (13) - Deploy All", "LinnRecords (14) - Nightly" ];

/* TODO - Tidy this up using a templating engine */

var addProblemJob = function (job) {
	var html = $.parseHTML('<a class="problem" href="'+job.url+'"><h2 class="col-xs-12 alert alert-danger"><span class="col-xs-1 glyphicon glyphicon-remove"></span> <div class="col-xs-11 name">'+job.name+'</div></h2></a>');
	$(document).find('.problems').append(html);
};
var addRunningJob = function (job) {
	var html = $.parseHTML('<a class="run" href="'+job.url+'"><h2 class="col-xs-12 alert alert-info"><span class="objblink col-xs-1 glyphicon glyphicon-play"></span> <div class="col-xs-11 name">'+job.name+'</div></h2></a>');
	$(document).find('.running').append(html);
};
var addAbortedJob = function (job) {
	var html = $.parseHTML('<a class="abort" href="'+job.url+'"><h2 class="col-xs-12 alert alert-warning"><span class="col-xs-1 glyphicon glyphicon-stop"></span> <div class="col-xs-11 name">'+job.name+'</div></h2></a>');
	$(document).find('.aborted').append(html);
};
var addSeaOfGreen = function (job) {
	var html = $.parseHTML('<h2 class="col-xs-12 alliswell alert alert-success"><span class="col-xs-1 glyphicon glyphicon-thumbs-up"></span> <div class="col-xs-11 name">Everything Is AWESOME!!!</div></h2>');
	$(document).find('.okay').append(html);
};
var removeAllJobs = function (job) {
	$(document).find('.problem').remove();
	$(document).find('.run').remove();
	$(document).find('.abort').remove();
	$(document).find('.alliswell').remove();
};

/* Useful helpers */
var unwantedJobs = function (job) {
	return _.contains(blacklistedJobs, job.name);
};
var currentlyRunning = function (job) {
	return job.color.indexOf('_anime') > -1;
};

/* Download the current status of all jobs and display results */

var updateStatus = function () {
	$.ajax({
		dataType: 'jsonp',
		url: 'http://it.linn.co.uk/hudson/api/json?jsonp=?',
		success: function (data) {
			var problemJobs = _.chain(data.jobs)
				.where({'color': 'red'})
				.reject(unwantedJobs)
				.map(function (datum) { return { name: datum.name, url: datum.url }; })
				.value();
			var runningJobs = _.chain(data.jobs)
				.filter(currentlyRunning)
				.reject(unwantedJobs)
				.map(function (datum) { return { name: datum.name, url: datum.url }; })
				.value();
			var abortedJobs = _.chain(data.jobs)
				.where({'color': 'aborted'})
				.reject(unwantedJobs)
				.map(function (datum) { return { name: datum.name, url: datum.url }; })
				.value();
			removeAllJobs();
			if (problemJobs.length + runningJobs.length + abortedJobs.length > 0) {
				_.each(problemJobs, function (job) {
					addProblemJob(job);
				});
				_.each(runningJobs, function (job) {
					addRunningJob(job);
				});
				_.each(abortedJobs, function (job) {
					addAbortedJob(job);
				});
			} else {
				addSeaOfGreen();
			}
		}
	});
};
updateStatus();
setInterval(updateStatus, 10000);