import { joinAgoraRoom } from './lib/libA.js';

var app = new Vue({
  el: '#app',
  data: {
    userId: '',
    agoraUid: '',
    gridId: '',
    role: '',
    statusAgora: '',
    socket: null,
    videoGridTable: [
      { gridId: 'grid-1', src: '', agoraUid: '', userId: '', statusAgora: '', available: true },
      { gridId: 'grid-2', src: '', agoraUid: '', userId: '', statusAgora: '', available: true },
      { gridId: 'grid-3', src: '', agoraUid: '', userId: '', statusAgora: '', available: true },
      { gridId: 'grid-4', src: '', agoraUid: '', userId: '', statusAgora: '', available: true },
      { gridId: 'grid-5', src: '', agoraUid: '', userId: '', statusAgora: '', available: true }
    ],
    client: null,
    localTrack: null,
    remoteUsers: {}
  },
  mounted() {
    this.socket = io(); // Initialize socket connection
    this.userId = 'console';
    this.role = 'console';
    this.statusAgora = 'mute'; // mute, published, etc.
    this.socket.on('sessionMessage', (sessionMessage) => {
      console.log('sessionMessage: ', sessionMessage);
      if (sessionMessage.message === '#updateMyInfo#') {
        this.updateVideoGridTable(sessionMessage.gridId, sessionMessage.agoraUid, sessionMessage.userId, sessionMessage.statusAgora);
      } else {
        this.displayUserMessage(sessionMessage.gridId,sessionMessage.message)
      }
    });
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'h264' });
    this.joinAgoraRoom();
    this.client.on('user-published', this.handleUserJoined);
  },
  methods: {
    async joinAgoraRoom() {
      return joinAgoraRoom.call(this);
    },

    async updateVideoGridTable(gridId, agoraUid, userId, statusAgora) {
      // Find the index of the videoGridTable entry based on gridId
      const index = this.videoGridTable.findIndex(item => item.gridId === gridId);
      if (index !== -1) {
        // Perform the necessary updates on the entry object at the found index
        const entry = this.videoGridTable[index];
        entry.src = 'new_source_value'; // Update with the appropriate value
        entry.agoraUid = agoraUid;
        entry.userId = userId;
        entry.statusAgora = statusAgora;
        console.log('entry agoraUid:', entry.agoraUid);
      }
    },

    handleUserJoined: async function (user, mediaType) {
      this.remoteUsers[user.uid] = user;
      await this.client.subscribe(user, mediaType);
      const track = user.videoTrack;
      console.log('track ', track)
      console.log('_videoTrack._id ', user._videoTrack._ID)
      console.log("remote pub or un-pub: ",user.uid)
      const entry = this.videoGridTable.find(item => item.agoraUid === user.uid);
      console.log('videoGrTbl ', this.videoGridTable)
      console.log('entry ', entry.gridId)
      if (entry && entry.available) {
        const videoElement = document.getElementById(entry.gridId);
        const textContent = document.createElement("div");
        if (videoElement && track) {
            track.play(entry.gridId);
          }
        }
    },
  
    displayUserMessage(userGridID, userMessage) {
      const videoGrid = document.getElementById(userGridID);
      const existingOverlay = videoGrid.querySelector(".video-overlay");
  
      if (existingOverlay) {
        videoGrid.removeChild(existingOverlay);
      }
      
      const textContent = document.createElement("div");
      textContent.innerHTML = userMessage;
      textContent.classList.add("video-overlay"); // Added CSS class for positioning
      videoGrid.appendChild(textContent);
    },
    
  }
});
