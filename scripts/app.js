(function (_, $, config) {
	var init = function (config) {

		var jobTemplate = _.template('<article title="<%- name %>" class="job <%- type %>"><h2 class="col-xs-12 alert alert-<%- alertState %>"><div class="col-xs-1"><span class="<%- iconCss %>"></span></div><div class="col-xs-11 name"><%- name %></div></h2></article>');

		var seaOfGreen = _.template('<article class="job"><h2 class="col-xs-12 alliswell alert alert-success"><span class="col-xs-1 glyphicon glyphicon-thumbs-up"></span> <div class="col-xs-11 name">Everything Is AWESOME!!!</div></h2></article>');

		var awesomeMeter = _.template('<h2 class="stats col-xs-12 well counter">We&apos;ve been awesome for <%- relativeAwesomeness %>!</h2>');

		var progressBarTemplate = _.template('<div class="progress"></div>');

		var progressBarEntry = _.template('<div class="progress-bar progress-bar-<%- alertState %>" style="width: <%- width %>%"></div>');

		var alertStates = {
			'problem': 'danger',
			'running': 'info',
			'aborted': 'warning',
			'ok': 'success'
		};

		var priority = {
			'problem': 2,
			'running': 0,
			'aborted': 1,
			'ok': 3
		};

		var toProblem = function (job) {
			return {
				type: 'problem',
				url: job.url,
				alertState: alertStates['problem'],
				iconCss: 'glyphicon glyphicon-thumbs-down',
				name: job.name
			};
		};

		var toRunning = function (job) {
			return {
				type: 'running',
				url: job.url,
				alertState: alertStates['running'],
				iconCss: 'objrotate glyphicon glyphicon-refresh',
				name: job.name
			};
		};

		var toAbort = function (job) {
			return {
				type: 'aborted',
				url: job.url,
				alertState: alertStates['aborted'],
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
			var history, newestOldStatus;
			if (supportsHtml5Storage()) {
				try {
					history = JSON.parse(localStorage.getItem("statusHistory"));
				} catch (e) {
				}
				if (!_.isArray(history)) {
					return [];
				}
				newestOldStatus = _.chain(history)
					.sortBy('time')
					.filter(oldStatus)
					.last()
					.value();
				if (newestOldStatus) {
					newestOldStatus.time = moment().subtract(config.hoursToSummarise, 'hours').format();
				}
				return _.chain(history)
					.sortBy('time')
					.reject(oldStatus)
					.unshift(newestOldStatus)
					.compact()
					.value();
			}
		};

		var statusThenName = function (job) {
			return priority[job.type] + job.name;
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
			var cutoff = moment().subtract(config.hoursToSummarise, 'hours');
			return moment(status.time).isBefore(cutoff);
		};

		var summarise = function (statusHistory) {
			var start = moment().subtract(config.hoursToSummarise, 'hours'),
				end = moment().valueOf();
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

		var renderHistoricalStatus = function (active) {
			var currentPercentage = 0,
				currentAlertState = 'unknown';
			$(document).find('.progress').remove();
			$(document).find('.summary').append(progressBarTemplate());
			_.each(summarise(statusHistory()), function (statum) {
				var width = Math.round(statum.fraction * 100) - currentPercentage;
				$(document).find('.progress').append(progressBarEntry({
					width: width,
					alertState: currentAlertState
				}));
				currentPercentage += width;
				currentAlertState = alertStates[statum.status];
			});
			$(document).find('.progress').append(progressBarEntry({
				width: 100 - currentPercentage,
				alertState: currentAlertState
			}));
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

			renderHistoricalStatus();
		};

		return function () {
			$.ajax({
				dataType: 'jsonp',
				url: config.jenkinsRoot + 'api/json?jsonp=?',
				success: render
			});
		};
	};

	var initThemes = function (config) {
		return function () {
			$(document).find('#theme').attr('href', config.themes[new Date().getMonth()]);
		};
	};

	var updateStatus = init(config);
	var updateTheme = initThemes(config);

	updateStatus();
	updateTheme();

	setInterval(updateStatus, 10000);
	setInterval(updateTheme, 86400000);
})(_, $, config);