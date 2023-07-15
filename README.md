#baton 

switching workstations:

git pull branch-master
work on code...
git add .
git commint -m "xxxx"
git push -u origin branch-master

-------------------------------
git init
git add README.md
git commit -m "first commit"
git branch -M branch-master
git remote add origin https://github.com/metatatt/baton.git
git push -u origin branch-master



6/22 displayAuditResults, playAuditAnimation, harmonize font & sizes
6/28 6/22 displayAuditResults, playAuditAnimation, harmonize font & sizes
6/28 this messageFunc.js is implementation of below version C. Other two implementations are logged as messageFunc-A.js, and -B.js

ver A: 2 sec scanQRCode to max imageArray, and filter top 5 based on similarity (SSIM) + legibility. cons: SSIM latency
ver B： 2sec to max imageArray, then legibility(threshhold) and use pixel-based similarity
ver c: same as A, except using PsNR (pixel-based metrics) for similarity, and legibilityScore*100
adjusted scores (after x 100) are as follows: 
index-0 legibility-51.60822143004512 diversity-373.7380270867427
index-1 legibility-51.60781081554327 diversity-374.10609807771635