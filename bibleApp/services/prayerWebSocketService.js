// prayerWebSocketService.js
class PrayerWebSocketService {
    static instance = null;
    callbacks = {};
    
    static getInstance() {
      if (!PrayerWebSocketService.instance) {
        PrayerWebSocketService.instance = new PrayerWebSocketService();
      }
      return PrayerWebSocketService.instance;
    }
    
    constructor() {
      this.socketRef = null;
      this.isConnected = false;
      this.channels = {};
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.userRequestedDisconnect = false;
    }
    
    connect(serverUrl) {
      if (this.socketRef) return;
      
      console.log('Connecting to WebSocket:', serverUrl);
      this.userRequestedDisconnect = false;
      
      // Create WebSocket connection
      this.socketRef = new WebSocket(serverUrl);
      
      this.socketRef.onopen = () => {
        console.log('WebSocket connection opened');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.executeCallback('connect', null);
        
        // Start heartbeat
        this.heartbeatInterval = setInterval(() => {
          this.sendHeartbeat();
        }, 30000);
      };
      
      this.socketRef.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('Received message:', data);
          
          // Handle different message types
          if (data.event === 'phx_reply') {
            // Handle reply to our messages
            console.log('Received reply:', data);
            this.executeCallback(`reply:${data.ref}`, data.payload);
          } else {
            // Handle other messages
            if (data.topic && data.event) {
              this.executeCallback(`${data.topic}:${data.event}`, data);
            }
            this.executeCallback(data.event, data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, e.data);
        }
      };
      
      this.socketRef.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.executeCallback('error', error);
      };
      
      this.socketRef.onclose = (e) => {
        console.log('WebSocket closed:', e.code, e.reason);
        this.isConnected = false;
        clearInterval(this.heartbeatInterval);
        
        // Clean up
        this.socketRef = null;
        this.channels = {};
        
        // Only attempt reconnect if it wasn't a user-requested disconnect
        if (!this.userRequestedDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          console.log(`Attempting to reconnect in ${delay}ms...`);
          
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(serverUrl);
          }, delay);
        } else {
          // Reset attempts if user disconnected or max attempts reached,
          // so the next manual connect starts fresh.
          this.reconnectAttempts = 0;
          if (this.userRequestedDisconnect) {
            console.log("Reconnection prevented by user request.");
          } else {
            console.log("Max reconnection attempts reached.");
          }
        }
      };
    }
    
    disconnect() {
      this.userRequestedDisconnect = true;
      console.log("User requested disconnect...");
      if (this.socketRef) {
        clearInterval(this.heartbeatInterval);
        this.socketRef.close();
      }
    }
    
    // Join a Phoenix channel
    joinChannel(topic) {
      if (!this.isConnected) {
        console.error('Cannot join channel: not connected');
        return Promise.reject('Not connected');
      }
      
      console.log('Joining channel:', topic);
      
      // Create a unique reference for this message
      const ref = Date.now().toString();
      
      // Create the join message in Phoenix format
      const joinMsg = {
        topic: topic,
        event: 'phx_join',
        payload: {},
        ref: ref
      };
      
      // Send the join message
      this.socketRef.send(JSON.stringify(joinMsg));
      
      // Return a promise that resolves when we get a successful join reply
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.removeCallbacks(`reply:${ref}`);
          reject('Timeout joining channel');
        }, 5000);
        
        this.addCallbacks(`reply:${ref}`, (payload) => {
          clearTimeout(timeout);
          this.removeCallbacks(`reply:${ref}`);
          
          if (payload.status === 'ok') {
            this.channels[topic] = true;
            console.log('Successfully joined channel:', topic);
            resolve(payload);
          } else {
            console.error('Failed to join channel:', payload);
            reject(payload);
          }
        });
      });
    }
    
    // Send a message to a channel
    sendToChannel(topic, event, payload = {}) {
      if (!this.isConnected) {
        console.error('Cannot send message: not connected');
        return Promise.reject('Not connected');
      }
      
      if (!this.channels[topic]) {
        console.error('Cannot send to channel: not joined', topic);
        return Promise.reject('Channel not joined');
      }
      
      console.log(`Sending ${event} to ${topic}:`, payload);
      
      // Create a unique reference for this message
      const ref = Date.now().toString();
      
      // Create the message in Phoenix format
      const msg = {
        topic: topic,
        event: event,
        payload: payload,
        ref: ref
      };
      
      // Send the message
      this.socketRef.send(JSON.stringify(msg));
      
      // Return a promise that resolves when we get a reply
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.removeCallbacks(`reply:${ref}`);
          reject('Timeout waiting for response');
        }, 10000);
        
        this.addCallbacks(`reply:${ref}`, (payload) => {
          clearTimeout(timeout);
          this.removeCallbacks(`reply:${ref}`);
          
          if (payload.status === 'ok') {
            resolve(payload);
          } else {
            reject(payload);
          }
        });
      });
    }
    
    // Send a heartbeat to keep the connection alive
    sendHeartbeat() {
      if (!this.isConnected) return;
      
      console.log('Sending heartbeat');
      
      const heartbeatMsg = {
        topic: 'phoenix',
        event: 'heartbeat',
        payload: {},
        ref: Date.now().toString()
      };
      
      this.socketRef.send(JSON.stringify(heartbeatMsg));
    }
    
    addCallbacks(messageType, callback) {
      if (!this.callbacks[messageType]) {
        this.callbacks[messageType] = [];
      }
      this.callbacks[messageType].push(callback);
    }
    
    removeCallbacks(messageType, callback) {
      if (this.callbacks[messageType]) {
        if (callback) {
          this.callbacks[messageType] = this.callbacks[messageType]
            .filter(cb => cb !== callback);
        } else {
          delete this.callbacks[messageType];
        }
      }
    }
    
    executeCallback(messageType, data) {
      if (this.callbacks[messageType]) {
        this.callbacks[messageType].forEach(callback => callback(data));
      }
    }
  }
  
  export default PrayerWebSocketService.getInstance();