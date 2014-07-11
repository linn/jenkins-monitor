(function (_, $, config) {
	var init = function (config) {

		var jobTemplate = _.template('<article class="job <%- type %>"><h2 class="col-xs-12 alert alert-<%- alertState %>"><div class="col-xs-1"><span class="<%- iconCss %>"></span></div><div class="col-xs-11 name"><%- name %></div></h2></article>');

		var seaOfGreen = _.template('<article class="job"><h2 class="col-xs-12 alliswell alert alert-success"><span class="col-xs-1 glyphicon glyphicon-thumbs-up"></span> <div class="col-xs-11 name">Everything Is AWESOME!!!</div></h2></article>');

		var awesomeMeter = _.template('<h2 class="stats col-xs-12 well counter">We&apos;ve been awesome for <%- minutesSinceLastFail %> minutes!</h2>');

		var toProblem = function (job) {
			return {
				type: 'problem',
				url: job.url,
				alertState: 'danger',
				iconCss: 'glyphicon glyphicon-thumbs-down',
				name: job.name
			};
		};

		var toRunning = function (job) {
			return {
				type: 'running',
				url: job.url,
				alertState: 'info',
				iconCss: 'objrotate glyphicon glyphicon-refresh',
				name: job.name
			};
		};

		var toAbort = function (job) {
			return {
				type: 'aborted',
				url: job.url,
				alertState: 'warning',
				iconCss: 'glyphicon glyphicon-stop',
				name: job.name
			};
		};

		var currentlyRunning = function (job) {
			return job.color.indexOf('_anime') > -1;
		};

		var unwantedJobs = function (job) {
			return _.contains(config.blacklistedJobs, job.name);
		};

		var nonRunningNightlyJobs = function (job) {
			return job.name.indexOf('Nightly') > -1 && job.type !== 'running';
		};

		var toJob = function (job) {
			if (job.color.indexOf('_anime') > -1) {
				return toRunning(job);
			}
			if (job.color === 'red') {
				return toProblem(job);
			}
			if (job.color === 'aborted') {
				return toAbort(job);
			}
			if (job.color === 'yellow') {
				return toProblem(job);
			}

		};

		var supportsHtml5Storage = function() {
			try {
				return 'localStorage' in window && window['localStorage'] !== null;
			} catch (e) {
				return false;
			}
		};

		var utcNow = function () {
			var now = new Date();
			return Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
		};

		var storeFailureTime = function () {
			if (supportsHtml5Storage()) {
				localStorage.setItem("lastknownFailureTime", utcNow());
			}
		};

		var calculateMinutesSinceFailure = function () {
			var now = utcNow();
			if (supportsHtml5Storage()) {
				var lastFailureTime = localStorage.getItem("lastknownFailureTime");
				if (lastFailureTime) {
					return Math.round((now - lastFailureTime) / 60000);
				}
			}
		};

		var statusThenName = function (job) {
			return job.type + job.name;
		};

		return function () {
			$.ajax({
				dataType: 'jsonp',
				url: config.jenkinsRoot + 'api/json?jsonp=?',
				success: function (data) {
					var jobs = _.chain(data.jobs)
						.map(toJob)
						.compact()
						.reject(unwantedJobs)
						.reject(nonRunningNightlyJobs)
						.sortBy(statusThenName)
						.value();

					$(document).find('.job').remove();
					if (jobs.length > 0) {
						_.each(jobs, function (job) {
							var dom = jobTemplate(job);
							$(document).find('.jobs').append(dom);
						});
					} else {
						$(document).find('.jobs').append(seaOfGreen());
					}

					if (_.findWhere(jobs, { type: 'problem' })) {
						storeFailureTime();
					}

					$(document).find('.stats').remove();
					if (!_.findWhere(jobs, { type: 'running' })) {
						var minutesSinceLastFail = calculateMinutesSinceFailure();
						if (minutesSinceLastFail > 0) {
							$(document).find('.jobs').append(awesomeMeter({ minutesSinceLastFail: minutesSinceLastFail }));
						}
					}
				}
			});
		};
	};

	var updateStatus = init(config);
	updateStatus();
	setInterval(updateStatus, 10000);

})(_, $, config);