<<<<<<< HEAD
# Agora
based on repo https://github.com/divanov11/group-video-chat with the following modifications:
-Node js env
-.env

  "agora-access-token": "^2.0.4",  改用 “agora-token" 否则 Azure出错

#directory map

├── node_modules/
├── public/ (client side)
│   ├── index.html 与其它 html
│   ├── master.css
│   └── master.js
    /lib/AgoraRTC_N-4.7.3.js
    /img/favicon.png, contact_me.png
├── index.js (sever side)
├── .env (server side)
└── package.json
=======
#Agora: per https://github.com/divanov11/group-video-chat with the following modifications:
  "agora-access-token": "^2.0.4",  改用 “agora-token" 否则 Azure出错

#handtrack.js ()
      <video autoplay="autoplay" id="myvideo"></video>
>>>>>>> 5df3bae21023f8e93672ee2c05cc97b304d45104

      const video=document.getElementById('myvideo')
      video.insertAdjacentHTML('beforeend', player)
      localTracks[1].play(video)

#index.js use {express} if use http module, the code will be bulkier like index-http-bulkier.js or index-http-socket.js (socket.io).

#在 index js (backend) 
  app.get('/env', (req, res) => {
    res.json({
      APP_ID: process.env.APP_ID,
      TOKEN: process.env.TOKEN,
      CHANNEL: process.env.CHANNEL
    });
  });

  前端 main.js fetch('/env')

# Installation
* 1 - clone repo https://github.com/divanov11/group-video-chat
* 2 - Create an account on agora.io and get APP ID, Temp Token and Channel Name
* 3 - Update APP ID, Temp Token and Channel Name in script.js

#instaSCAN
 https://github.com/schmich/instascan (VUEjs 与 Adpater JS)

To name a local Git repository as "simon" and push it to the branch of "simon2" in the remote repository located at https://github.com/metatatt/linecam-o, you can follow these steps:

-git init
-git add *
git commit -m "Your commit message"
git branch -M branch-0525
git remote add origin-0525 https://github.com/metatatt/linecam-master.git
git push -u origin-0525 branch-0525

git push` from local repository.


#video 

![My Image](640-480-15-.png)
![My Image](1280-640-15-1130.png)

      localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({
        encoderConfig: 
        {
        width: 1280,
        // Specify a value range and an ideal value
        height: { ideal: 720, min: 600, max: 800 },
        frameRate: 15,
        bitrateMin: 1130, bitrateMax: 1300,
        },
        });


#ngrok
1）login ngrok.com sign in as Github metatatt99@gmail.com
2) runtime @ C:\Users\prese\Desktop\chatAz2\utilities	
3）ngrok config add-authtoken 2FCKkwsTMvJMTOvbnkyFsJbnD1i_DqkWwhAmpLErjii7qzMS	
3）启动node.js启动 （也就是可以跑 http://localhost:3000/）	
4）ngork http 3000 （设立gnork的端口）	
5）手机启动 https://0b2f-172-88-73-0.ngrok-free.app

#528: 采用 html5-qr
this.result = decodedResult 或是  this.result = decodedText
{ "decodedText": "display simon", "result": { "text": "display simon", "format": { "format": 0, "formatName": "QR_CODE" }, "debugData": { "decoderName": "zxing-js" } } }

#https://cloud.bitbar.com/#testing/dashboard cross-browser testing