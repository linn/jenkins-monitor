(function (_, $, config) {
	var init = function (config) {

		var jobTemplate = _.template('<a class="job <%- type %>" href="<%- jobUrl %>"><h2 class="col-xs-12 alert alert-<%- alertState %>"><div class="col-xs-1"><span class="<%- iconCss %>"></span></div><div class="col-xs-11 name"><%- jobName %></div></h2></a>');

		var seaOfGreen = _.template('<a class="job"><h2 class="col-xs-12 alliswell alert alert-success"><span class="col-xs-1 glyphicon glyphicon-thumbs-up"></span> <div class="col-xs-11 name">Everything Is AWESOME!!!</div></h2></a>');

		var toProblem = function (job) {
			return {
				type: 'problem',
				jobUrl: job.url,
				alertState: 'danger',
				iconCss: 'glyphicon glyphicon-thumbs-down',
				jobName: job.name
			};
		};

		var toRunning = function (job) {
			return {
				type: 'run',
				jobUrl: job.url,
				alertState: 'info',
				iconCss: 'objrotate glyphicon glyphicon-refresh',
				jobName: job.name
			};
		};

		var toAbort = function (job) {
			return {
				type: 'abort',
				jobUrl: job.url,
				alertState: 'warning',
				iconCss: 'glyphicon glyphicon-stop',
				jobName: job.name
			};
		};

		var currentlyRunning = function (job) {
			return job.color.indexOf('_anime') > -1;
		};

		var unwantedJobs = function (job) {
			return _.contains(config.blacklistedJobs, job.name);
		};

		var nightlyJobs = function (job) {
			return job.name.indexOf('Nightly') > -1;
		};

		return function () {
			$.ajax({
				dataType: 'jsonp',
				url: config.jenkinsRoot + 'api/json?jsonp=?',
				success: function (data) {
					var problemJobs = _.chain(data.jobs)
						.where({'color': 'red'})
						.reject(unwantedJobs)
						.reject(nightlyJobs)
						.map(toProblem)
						.value();
					var runningJobs = _.chain(data.jobs)
						.filter(currentlyRunning)
						.reject(unwantedJobs)
						.map(toRunning)
						.value();
					var abortedJobs = _.chain(data.jobs)
						.where({'color': 'aborted'})
						.reject(unwantedJobs)
						.map(toAbort)
						.value();
					var unstableJobs = _.chain(data.jobs)
						.where({'color': 'yellow'})
						.reject(unwantedJobs)
						.reject(nightlyJobs)
						.map(toProblem)
						.value();
					$(document).find('.job').remove();
					var jobs = _.union(problemJobs, runningJobs, abortedJobs, unstableJobs);
					if (jobs.length > 0) {
						_.each(jobs, function (job) {
							var dom = jobTemplate(job);
							$(document).find('.jobs').append(dom);
						});
					} else {
						$(document).find('.jobs').append(seaOfGreen());
					}
				}
			});
		};
	};

	var updateStatus = init(config);
	updateStatus();
	setInterval(updateStatus, 10000);

})(_, $, config);