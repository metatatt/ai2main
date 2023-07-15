    
    export async function shareScreenToRoom() {
      this.cameraShared = !this.cameraShared;
      if (this.cameraShared) {
        console.log('getUserMedia successfully');
        if (this.shareClickCount === 0) {
          this.client.publish(this.localTrack);
          this.shareClickCount++;
        } else {
          this.localTrack.setEnabled(true);
        }
        this.shareLabel = 'Hide Camera View';
      } else {
        this.localTrack.setEnabled(false);
        this.shareLabel = 'Share Camera View';
      }
    };
  
  export async function handleUserJoined(user, mediaType) {
    this.remoteUsers[user.uid] = user;
    await this.client.subscribe(user, mediaType);
    console.log("user", user.uid);
    console.log("user", user._videoTrack._ID);
  
    socket.on('userInfoUpdate', (updatedUserInfo) => {
      // Handle the updated user information
      console.log('Received updated user info:', updatedUserInfo);
      
      // Check if the updated user information matches the current user
      if (updatedUserInfo.uid === user.uid) {
        const { gridId, userId, cameraStatus, mostRecentWork } = updatedUserInfo;
        
        // Find the video wrapper element with the matching gridId
        let videoWrapper = document.getElementById(gridId);
        
        // If the video wrapper element is not found, use the first available video wrapper
        if (!videoWrapper) {
          const availableVideoWrapper = document.querySelector('.grid-open');
          if (availableVideoWrapper) {
            videoWrapper = availableVideoWrapper;
            videoWrapper.classList = 'video-wrapper grid-taken';
            videoWrapper.id = gridId;
          }
        }
    
        if (videoWrapper) {
          const remoteVideoTrack = user.videoTrack;
          if (remoteVideoTrack) {
            remoteVideoTrack.play(videoWrapper);
          }
        }
      }
    });
  
    // Rest of the function code...
  }
  
    
    
    export async function handleUserLeft(user) {
      delete this.remoteUsers[user.uid];
      const videoWrapper = document.getElementById(`${this.remoteUsers[user.uid].uid}`);
  
      videoWrapper.classList = 'video-wrapper grid-open';
      videoWrapper.id = "";
      }
  ;
  
    export async function handleUserPause(user) {
      const videoWrapper = document.getElementById(`${this.remoteUsers[user.uid].uid}`);
      videoWrapper.classList = 'video-wrapper grid-muted';
      };
  
    export async function handleUserResume(user) {
      const videoWrapper = document.getElementById(`${this.remoteUsers[user.uid].uid}`);
      videoWrapper.classList = 'video-wrapper grid-taken';
        const remoteVideoTrack = user.videoTrack;
        if (remoteVideoTrack) {
          remoteVideoTrack.play(videoWrapper);
        }
      };
  
    