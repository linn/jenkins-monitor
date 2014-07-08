jenkins-monitor
===============

A single page overview of currently running; failed; and aborted jobs on a Jenkins CI server. Clicking the job takes you to the job page on Jenkins. 


Installation
============

You will need to modify the config.js to configure the path to your CI server, you can add any Jenkins jobs to the blacklist so these can be excluded from the display if you want this. The blacklist should be an array of strings representing the exact Jenkins job name. 

Once config.js has been configured, open `index.html`. It will run from a file:// if required. 
