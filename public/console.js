import { joinAgoraRoom, setConsoleOverlay, messageBox, graphicsBox,pageRouter } from './lib/libA.js';

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
      if (sessionMessage.messageClass === '#updateMyInfo#') {
        this.updateVideoGridTable(sessionMessage.gridId, sessionMessage.agoraUid, sessionMessage.userId, sessionMessage.statusAgora);
      } else if(sessionMessage.messageClass === '#messageBox#'){
        this.consoleMessageBox(sessionMessage.message, sessionMessage.gridId)
      } else if(sessionMessage.messageClass === '#graphicsBox#'){
        this.consoleGraphicsBox(sessionMessage.message, sessionMessage.gridId)
      } else if(sessionMessage.messageClass === '#slide#'){
        this.consolePlaySlide(sessionMessage.message, sessionMessage.gridId)
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
      }
    },

    handleUserJoined: async function (user, mediaType) {
      this.remoteUsers[user.uid] = user;
      await this.client.subscribe(user, mediaType);
      const track = user.videoTrack;
      const entry = this.videoGridTable.find(item => item.agoraUid === user.uid);
      console.log('entry ', entry.gridId)
      if (entry && entry.available) {
        const videoElement = document.getElementById(entry.gridId);
        const textContent = document.createElement("div");
        if (videoElement && track) {
            track.play(videoElement);

            setConsoleOverlay(0.8,entry.gridId)
          }
        }
    },
  
    async consoleMessageBox(message, gridId){
      console.log(`grid ${gridId} || message ${message}`)
      messageBox(message,gridId)

    },

    async consoleGraphicsBox(message, gridId){
      graphicsBox(message, gridId)
    },

    async consolePlaySlide(gridId, message){
      const video = document.getElementById(entry.gridId);
      messageBox(message,gridId)

    },

    displayUserMessage(userGridID, userMessage) {
      const videoGrid = document.getElementById(userGridID);
      const existingOverlay = videoGrid.querySelector(".overlay");
  
      if (existingOverlay) {
        videoGrid.removeChild(existingOverlay);
      }
      
      const textContent = document.createElement("div");
      textContent.innerHTML = userMessage;
      textContent.classList.add("overlay"); // Added CSS class for positioning
      videoGrid.appendChild(textContent);
    },

    showFindings(userGridID,findingsDOM){
      const videoGrid = document.getElementById(userGridID);
      const existingOverlay = videoGrid.querySelector(".slide");
      console.log("findingsDOM: ",findingsDOM)
      if (existingOverlay) {
        videoGrid.removeChild(existingOverlay);
      }
      // Get the root element
      const root = document.documentElement;

      // Set the value of the "--factor" variable
      const newFactorValue = 0.5;
      root.style.setProperty('--factor', newFactorValue);

      const textContent = document.createElement("div");
      textContent.innerHTML = findingsDOM;
      textContent.classList.add("slide"); // Added CSS class for positioning
      videoGrid.appendChild(textContent);
    },
    
  }
});
