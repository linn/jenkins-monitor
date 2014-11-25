(function (_, $, config) {
	var init = function (config) {

		var jobTemplate = _.template('<article class="job <%- type %>"><h2 class="col-xs-12 alert alert-<%- alertState %>"><div class="col-xs-1"><span class="<%- iconCss %>"></span></div><div class="col-xs-11 name"><%- name %></div></h2></article>');

		var seaOfGreen = _.template('<article class="job"><h2 class="col-xs-12 alliswell alert alert-success"><span class="col-xs-1 glyphicon glyphicon-thumbs-up"></span> <div class="col-xs-11 name">Everything Is AWESOME!!!</div></h2></article>');

		var awesomeMeter = _.template('<h2 class="stats col-xs-12 well counter">We&apos;ve been awesome for <%- relativeAwesomeness %>!</h2>');

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

		var storeFailureTime = function () {
			if (supportsHtml5Storage()) {
				localStorage.setItem("lastknownFailureTime", moment().utc());
			}
		};

		var getLastFailureTime = function () {
			if (supportsHtml5Storage()) {
				var lastFailureTime = localStorage.getItem("lastknownFailureTime");
				if (lastFailureTime) {
					return moment.utc(lastFailureTime);
				}
			}
		};

		var updateStatus = function (status) {
			var history, mostRecentStatus;
			if (supportsHtml5Storage()) {
				try {
					history = JSON.parse(localStorage.getItem("statusHistory"));
				} catch (e) {
				}
				if (!_.isArray(history)) {
					history = [];
				}
				mostRecentStatus = _.last(history);
				if (!mostRecentStatus || mostRecentStatus.status !== status) {
					history.push({
						time: moment().utc(),
						status: status
					});
				}
				localStorage.setItem("statusHistory", JSON.stringify(history));
				return history;
			}
		};

		var statusHistory = function () {
			var history;
			if (supportsHtml5Storage()) {
				try {
					history = JSON.parse(localStorage.getItem("statusHistory"));
				} catch (e) {
				}
				if (!_.isArray(history)) {
					return [];
				}
				return _.chain(history)
					.sortBy('time')
					.reject(oldStatus)
					.value();
			}
		};

		var statusThenName = function (job) {
			return job.type + job.name;
		};

		var statusOverview = function (jobs) {
			if (_.findWhere(jobs, { type: 'problem' })) {
				return 'problem';
			}
			if (_.findWhere(jobs, { type: 'running' })) {
				return 'running';
			}
			if (_.findWhere(jobs, { type: 'aborted' })) {
				return 'aborted';
			}
			return 'ok';
		};

		var oldStatus = function (status) {
			var cutoff = moment().subtract(1, 'days');
			return moment(status.time).isBefore(cutoff);
		};

		var statusSummary = function (statusHistory) {
			var start = moment(_.first(statusHistory).time).valueOf(),
				end = moment(_.last(statusHistory).time).valueOf();
			return _.chain(statusHistory)
					.map(function (instance) {
						var time = moment(instance.time).valueOf();
						return {
							fraction: (time - start) / (end - start),
							time: instance.time,
							status: instance.status
						};
					})
					.value();
		};

		var render = function (data) {
			var statusThatWeAre,
				jobs;

			jobs = _.chain(data.jobs)
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

			statusThatWeAre = statusOverview(jobs);
			updateStatus(statusThatWeAre);

			if (statusThatWeAre === "problem") {
				storeFailureTime();
			}

			$(document).find('.stats').remove();
			if (statusThatWeAre !==  'running' ) {
				var lastFailureTime = getLastFailureTime();
				if (lastFailureTime && (moment.utc() - lastFailureTime) > 60000) {
					$(document).find('.jobs').append(awesomeMeter({ relativeAwesomeness: lastFailureTime.fromNow(true) }));
				}
			}

			var temp = statusSummary(statusHistory());
		};

		return function () {
			$.ajax({
				dataType: 'jsonp',
				url: config.jenkinsRoot + 'api/json?jsonp=?',
				success: render
			});
		};
	};

	var updateStatus = init(config);
	updateStatus();
	setInterval(updateStatus, 10000);

})(_, $, config);