# Cron changelog

To automate the process of syncing and uploading Eagle elements to the Sanity studio, I decided to create a crontab that will run the two commands (npm run eagle-sync and npm run eagle-upload)

As I have both success and failure with this, I will update this markdown file with the changes made:

## 05/31: First one made

``0 2 * * * cd /Users/krisaziabor/Developer/personal/library && /opt/homebrew/bin/npm run eagle-sync && /opt/homebrew/bin/npm run eagle-upload > /tmp/eagle-cron.log 2>&1 && osascript -e 'display notification "Eagle sync/upload complete. See log for details." with title "Eagle Automation"'``

This not only runs the scripts but uses osascript to display a notification to my MacBook with the log from the script running.
