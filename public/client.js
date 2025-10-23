class VideoCallClient {
    constructor() {
        this.socket = null;
        this.device = null;
        this.eventId = null;
        this.currentEventId = null;

        // Mediasoup
        this.routerRtpCapabilities = null;
        this.producerTransport = null;
        this.consumerTransport = null;
        this.producers = new Map();
        this.consumers = new Map();

        // Media streams
        this.localStream = null;
        this.audioProducer = null;
        this.videoProducer = null;

        // Remote users tracking
        this.remoteUsers = new Map();

        // UI Elements
        this.connectBtn = document.getElementById('connectBtn');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        this.joinEventBtn = document.getElementById('joinEventBtn');
        this.leaveEventBtn = document.getElementById('leaveEventBtn');
        this.startVideoBtn = document.getElementById('startVideoBtn');
        this.stopVideoBtn = document.getElementById('stopVideoBtn');
        this.startAudioBtn = document.getElementById('startAudioBtn');
        this.stopAudioBtn = document.getElementById('stopAudioBtn');
        this.cameraSelect = document.getElementById('cameraSelect');
        this.microphoneSelect = document.getElementById('microphoneSelect');
        this.clearLogsBtn = document.getElementById('clearLogsBtn');

        this.localVideo = document.getElementById('localVideo');
        this.remoteVideos = document.getElementById('remoteVideos');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.eventStatus = document.getElementById('eventStatus');
        this.logs = document.getElementById('logs');

        // Kiểm tra mediasoup-client
        if (typeof mediasoupClient === 'undefined') {
            this.log('Lỗi: Thư viện mediasoup-client chưa được tải. Kiểm tra kết nối internet và thử lại.', 'error');
        } else {
            this.log('Thư viện mediasoup-client đã sẵn sàng', 'success');
        }

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connect());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.joinEventBtn.addEventListener('click', () => this.joinEvent());
        this.leaveEventBtn.addEventListener('click', () => this.leaveEvent());
        this.startVideoBtn.addEventListener('click', () => this.startVideo());
        this.stopVideoBtn.addEventListener('click', () => this.stopVideo());
        this.startAudioBtn.addEventListener('click', () => this.startAudio());
        this.stopAudioBtn.addEventListener('click', () => this.stopAudio());
        this.clearLogsBtn.addEventListener('click', () => this.clearLogs());

        this.cameraSelect.addEventListener('change', () => this.changeCamera());
        this.microphoneSelect.addEventListener('change', () => this.changeMicrophone());
    }

    connect() {
        const token = document.getElementById('tokenInput').value;
        const serverUrl = document.getElementById('serverUrl').value;

        if (!token) {
            this.log('Vui lòng nhập JWT token', 'error');
            return;
        }

        if (typeof mediasoupClient === 'undefined') {
            this.log('Lỗi: Thư viện mediasoup-client không khả dụng. Tải lại trang và thử lại.', 'error');
            return;
        }

        this.log('Đang kết nối đến server...', 'info');
        this.updateConnectionStatus('connecting', 'Đang kết nối...');

        try {
            this.socket = io(serverUrl, {
                auth: {
                    token: token
                }
            });

            this.setupSocketListeners();

            this.connectBtn.disabled = true;
            this.disconnectBtn.disabled = false;
        } catch (error) {
            this.log(`Lỗi kết nối: ${error.message}`, 'error');
            this.updateConnectionStatus('disconnected', 'Lỗi kết nối');
        }
    }

    disconnect() {
        if (this.socket) {
            if (this.currentEventId) {
                this.leaveEvent();
            }

            this.socket.disconnect();
            this.socket = null;
        }

        this.updateConnectionStatus('disconnected', 'Đã ngắt kết nối');
        this.connectBtn.disabled = false;
        this.disconnectBtn.disabled = true;
        this.joinEventBtn.disabled = true;
        this.leaveEventBtn.disabled = true;

        this.stopAllMedia();
        this.log('Đã ngắt kết nối', 'info');
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            this.log('Đã kết nối đến server', 'success');
            this.updateConnectionStatus('connected', 'Đã kết nối');
            this.joinEventBtn.disabled = false;
        });

        this.socket.on('disconnect', (reason) => {
            this.log(`Mất kết nối: ${reason}`, 'error');
            this.updateConnectionStatus('disconnected', 'Mất kết nối');
            this.joinEventBtn.disabled = true;
            this.leaveEventBtn.disabled = true;
            this.stopAllMedia();
        });

        this.socket.on('connect_error', (error) => {
            this.log(`Lỗi kết nối: ${error.message}`, 'error');
            this.updateConnectionStatus('disconnected', 'Lỗi kết nối');
        });

        // Event handlers
        this.socket.on('event:join_success', async (data) => {
            this.log(`Đã tham gia sự kiện: ${data.title}`, 'success');
            this.updateEventStatus('joined', `Đã tham gia: ${data.title}`);
            this.currentEventId = data.eventId;

            try {
                // Khởi tạo mediasoup device
                await this.initializeMediasoupDevice(data.eventId);

                // Tự động consume các producer đang tồn tại
                if (data.existingProducers && data.existingProducers.length > 0) {
                    this.log(`Tìm thấy ${data.existingProducers.length} producer đang hoạt động`, 'info');
                    data.existingProducers.forEach(producer => {
                        this.consumeProducer(producer.producerId, producer.userId, '', producer.kind, producer.fullName);
                    });
                }

                // Bắt đầu media
                await this.startMedia();

                this.leaveEventBtn.disabled = false;
                this.startVideoBtn.disabled = false;
                this.startAudioBtn.disabled = false;

            } catch (error) {
                this.log(`Lỗi khởi tạo media: ${error.message}`, 'error');
            }
        });

        this.socket.on('event:error', (data) => {
            this.log(`Lỗi sự kiện: ${data.message}`, 'error');
            this.updateEventStatus('error', data.message);
        });

        this.socket.on('event:user_joined', (data) => {
            this.log(`Người dùng ${data.fullName} đã tham gia`, 'info');
        });

        this.socket.on('event:user_left', (data) => {
            this.log(`Người dùng ${data.fullName} đã rời đi`, 'info');
            this.removeRemoteUser(data.socketId);
        });

        this.socket.on('newProducer', (data) => {
            this.log(`Có producer mới từ ${data.fullName} (${data.kind})`, 'info');
            this.consumeProducer(data.producerId, data.userId, data.socketId, data.kind, data.fullName);
        });

        this.socket.on('producerClosed', (data) => {
            this.log(`Producer ${data.producerId} đã đóng`, 'info');
            this.removeProducer(data.producerId);
        });

        this.socket.on('consumerClosed', (data) => {
            this.log(`Consumer ${data.consumerId} đã đóng`, 'info');
            this.removeConsumer(data.consumerId);
        });
    }

    async joinEvent() {
        this.eventId = document.getElementById('eventIdInput').value;

        if (!this.eventId) {
            this.log('Vui lòng nhập ID sự kiện', 'error');
            return;
        }

        this.log(`Đang tham gia sự kiện ${this.eventId}...`, 'info');
        this.updateEventStatus('joining', 'Đang tham gia sự kiện...');

        this.socket.emit('event:join', { eventId: this.eventId });
    }

    leaveEvent() {
        if (this.currentEventId) {
            this.socket.emit('event:leave', { eventId: this.currentEventId });
            this.log('Đã rời khỏi sự kiện', 'info');
        }

        this.updateEventStatus('left', 'Đã rời khỏi sự kiện');
        this.currentEventId = null;
        this.leaveEventBtn.disabled = true;
        this.startVideoBtn.disabled = true;
        this.stopVideoBtn.disabled = true;
        this.startAudioBtn.disabled = true;
        this.stopAudioBtn.disabled = true;

        this.stopAllMedia();
        this.clearRemoteUsers();
    }

    async initializeMediasoupDevice(eventId) {
        try {
            // Kiểm tra lại mediasoupClient
            if (typeof mediasoupClient === 'undefined') {
                throw new Error('Thư viện mediasoup-client không khả dụng');
            }

            // Lấy router RTP capabilities
            this.routerRtpCapabilities = await this.getRouterRtpCapabilities(eventId);

            // Tạo device
            this.device = new mediasoupClient.Device();

            // Load device với router capabilities
            await this.device.load({ routerRtpCapabilities: this.routerRtpCapabilities });

            this.log('Đã khởi tạo Mediasoup device', 'success');
            return true;
        } catch (error) {
            this.log(`Lỗi khởi tạo Mediasoup device: ${error.message}`, 'error');
            throw error;
        }
    }

    getRouterRtpCapabilities(eventId) {
        return new Promise((resolve, reject) => {
            this.socket.emit('getRouterRtpCapabilities', { eventId }, (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }

    async startMedia() {
        try {
            // Tạo transports
            await this.createTransports();

            // Lấy danh sách thiết bị media
            await this.getMediaDevices();

            this.log('Đã sẵn sàng để bắt đầu media', 'success');
            return true;
        } catch (error) {
            this.log(`Lỗi khởi tạo media: ${error.message}`, 'error');
            throw error;
        }
    }

    async createTransports() {
        try {
            // Tạo producer transport
            this.producerTransport = await this.createTransport('producer');

            // Tạo consumer transport
            this.consumerTransport = await this.createTransport('consumer');

            this.log('Đã tạo transports', 'success');
            return true;
        } catch (error) {
            this.log(`Lỗi tạo transports: ${error.message}`, 'error');
            throw error;
        }
    }

    createTransport(type) {
        return new Promise((resolve, reject) => {
            this.socket.emit('createWebRtcTransport', {
                eventId: this.currentEventId,
                type
            }, async (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }

                let transport;
                try {
                    if (type === 'producer') {
                        transport = this.device.createSendTransport(response);
                    } else {
                        transport = this.device.createRecvTransport(response);
                    }

                    // Xử lý sự kiện transport
                    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                        try {
                            await this.connectTransport(transport.id, dtlsParameters);
                            callback();
                        } catch (error) {
                            errback(error);
                        }
                    });

                    if (type === 'producer') {
                        transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
                            try {
                                const { id } = await this.produce(transport.id, kind, rtpParameters, appData);
                                callback({ id });
                            } catch (error) {
                                errback(error);
                            }
                        });
                    }

                    resolve(transport);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    connectTransport(transportId, dtlsParameters) {
        return new Promise((resolve, reject) => {
            this.socket.emit('connectWebRtcTransport', {
                eventId: this.currentEventId,
                transportId,
                dtlsParameters
            }, (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve();
                }
            });
        });
    }

    produce(transportId, kind, rtpParameters, appData) {
        return new Promise((resolve, reject) => {
            this.socket.emit('produce', {
                eventId: this.currentEventId,
                transportId,
                kind,
                rtpParameters,
                appData
            }, (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }

    async startVideo() {
        try {
            if (!this.producerTransport) {
                throw new Error('Producer transport chưa sẵn sàng');
            }

            if (!this.localStream) {
                await this.getUserMedia();
            }

            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                this.videoProducer = await this.producerTransport.produce({
                    track: videoTrack,
                    encodings: [
                        { maxBitrate: 100000 },
                        { maxBitrate: 300000 },
                        { maxBitrate: 900000 }
                    ],
                    codecOptions: {
                        videoGoogleStartBitrate: 1000
                    }
                });

                this.producers.set(this.videoProducer.id, this.videoProducer);

                this.videoProducer.on('transportclose', () => {
                    this.log('Video producer transport đã đóng', 'info');
                    this.producers.delete(this.videoProducer.id);
                    this.videoProducer = null;
                });

                this.videoProducer.on('trackended', () => {
                    this.log('Video track đã kết thúc', 'info');
                    this.stopVideo();
                });

                this.log('Đã bắt đầu video', 'success');

                this.startVideoBtn.disabled = true;
                this.stopVideoBtn.disabled = false;
            }
        } catch (error) {
            this.log(`Lỗi bắt đầu video: ${error.message}`, 'error');
        }
    }

    async startAudio() {
        try {
            if (!this.producerTransport) {
                throw new Error('Producer transport chưa sẵn sàng');
            }

            if (!this.localStream) {
                await this.getUserMedia();
            }

            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                this.audioProducer = await this.producerTransport.produce({
                    track: audioTrack
                });

                this.producers.set(this.audioProducer.id, this.audioProducer);

                this.audioProducer.on('transportclose', () => {
                    this.log('Audio producer transport đã đóng', 'info');
                    this.producers.delete(this.audioProducer.id);
                    this.audioProducer = null;
                });

                this.audioProducer.on('trackended', () => {
                    this.log('Audio track đã kết thúc', 'info');
                    this.stopAudio();
                });

                this.log('Đã bắt đầu audio', 'success');

                this.startAudioBtn.disabled = true;
                this.stopAudioBtn.disabled = false;
            }
        } catch (error) {
            this.log(`Lỗi bắt đầu audio: ${error.message}`, 'error');
        }
    }

    stopVideo() {
        if (this.videoProducer) {
            this.videoProducer.close();
            this.producers.delete(this.videoProducer.id);
            this.videoProducer = null;
            this.log('Đã dừng video', 'info');

            this.startVideoBtn.disabled = false;
            this.stopVideoBtn.disabled = true;
        }
    }

    stopAudio() {
        if (this.audioProducer) {
            this.audioProducer.close();
            this.producers.delete(this.audioProducer.id);
            this.audioProducer = null;
            this.log('Đã dừng audio', 'info');

            this.startAudioBtn.disabled = false;
            this.stopAudioBtn.disabled = true;
        }
    }

    async getUserMedia() {
        try {
            const cameraId = this.cameraSelect.value;
            const microphoneId = this.microphoneSelect.value;

            const constraints = {
                video: cameraId ? {
                    deviceId: cameraId,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } : {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: microphoneId ? {
                    deviceId: microphoneId,
                    echoCancellation: true,
                    noiseSuppression: true
                } : {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.localVideo.srcObject = this.localStream;

            this.log('Đã lấy stream media từ thiết bị', 'success');
        } catch (error) {
            this.log(`Lỗi truy cập thiết bị media: ${error.message}`, 'error');
            throw error;
        }
    }

    async getMediaDevices() {
        try {
            // Đầu tiên, cần có stream để có thể lấy device labels (trình duyệt yêu cầu)
            if (!this.localStream) {
                await this.getUserMedia();
            }

            const devices = await navigator.mediaDevices.enumerateDevices();

            // Lọc và hiển thị cameras
            const cameras = devices.filter(device => device.kind === 'videoinput');
            this.cameraSelect.innerHTML = '<option value="">Chọn camera</option>';
            cameras.forEach(camera => {
                const option = document.createElement('option');
                option.value = camera.deviceId;
                option.text = camera.label || `Camera ${this.cameraSelect.length + 1}`;
                this.cameraSelect.appendChild(option);
            });

            // Lọc và hiển thị microphones
            const microphones = devices.filter(device => device.kind === 'audioinput');
            this.microphoneSelect.innerHTML = '<option value="">Chọn microphone</option>';
            microphones.forEach(microphone => {
                const option = document.createElement('option');
                option.value = microphone.deviceId;
                option.text = microphone.label || `Microphone ${this.microphoneSelect.length + 1}`;
                this.microphoneSelect.appendChild(option);
            });

            this.cameraSelect.disabled = false;
            this.microphoneSelect.disabled = false;

            this.log('Đã tải danh sách thiết bị media', 'success');
        } catch (error) {
            this.log(`Lỗi lấy danh sách thiết bị: ${error.message}`, 'error');
        }
    }

    async changeCamera() {
        if (this.localStream) {
            const wasVideoProducing = this.videoProducer !== null;

            if (wasVideoProducing) {
                this.stopVideo();
            }

            // Dừng track video hiện tại
            this.localStream.getVideoTracks().forEach(track => track.stop());

            await this.getUserMedia();

            if (wasVideoProducing) {
                await this.startVideo();
            }
        }
    }

    async changeMicrophone() {
        if (this.localStream) {
            const wasAudioProducing = this.audioProducer !== null;

            if (wasAudioProducing) {
                this.stopAudio();
            }

            // Dừng track audio hiện tại
            this.localStream.getAudioTracks().forEach(track => track.stop());

            await this.getUserMedia();

            if (wasAudioProducing) {
                await this.startAudio();
            }
        }
    }

    async consumeProducer(producerId, userId, socketId, kind, userName) {
        try {
            if (!this.consumerTransport) {
                this.log('Consumer transport chưa sẵn sàng', 'error');
                return;
            }

            const { rtpCapabilities } = this.device;
            const consumer = await this.consumerTransport.consume({
                producerId,
                rtpCapabilities,
                paused: true
            });

            this.consumers.set(consumer.id, consumer);

            // Tạo hoặc cập nhật remote user
            let remoteUser = this.remoteUsers.get(socketId);
            if (!remoteUser) {
                remoteUser = this.createRemoteUser(socketId, userId, userName);
                this.remoteUsers.set(socketId, remoteUser);
            }

            // Thêm track vào stream tương ứng
            if (kind === 'video') {
                if (remoteUser.videoStream) {
                    remoteUser.videoStream.addTrack(consumer.track);
                } else {
                    remoteUser.videoStream = new MediaStream([consumer.track]);
                    remoteUser.videoElement.srcObject = remoteUser.videoStream;
                }
                remoteUser.hasVideo = true;
            } else if (kind === 'audio') {
                if (remoteUser.audioStream) {
                    remoteUser.audioStream.addTrack(consumer.track);
                } else {
                    remoteUser.audioStream = new MediaStream([consumer.track]);
                    remoteUser.audioElement.srcObject = remoteUser.audioStream;
                }
                remoteUser.hasAudio = true;
            }

            // Cập nhật hiển thị
            this.updateRemoteUserDisplay(remoteUser);

            // Tiếp tục consumer
            await this.resumeConsumer(consumer.id);

            this.log(`Đã kết nối đến ${kind} từ ${userName}`, 'success');
        } catch (error) {
            this.log(`Lỗi kết nối đến producer: ${error.message}`, 'error');
        }
    }

    createRemoteUser(socketId, userId, userName) {
        const wrapper = document.createElement('div');
        wrapper.className = 'video-wrapper';
        wrapper.id = `remote-${socketId}`;

        const videoElement = document.createElement('video');
        videoElement.id = `remote-video-${socketId}`;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.className = 'remote-video';

        const audioElement = document.createElement('audio');
        audioElement.id = `remote-audio-${socketId}`;
        audioElement.autoplay = true;
        audioElement.className = 'remote-audio';

        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <h3>${userName || userId}</h3>
            <div class="user-status">
                <span class="video-status">📹 Đang tải...</span>
                <span class="audio-status">🎤 Đang tải...</span>
            </div>
        `;

        wrapper.appendChild(userInfo);
        wrapper.appendChild(videoElement);
        wrapper.appendChild(audioElement);

        this.remoteVideos.appendChild(wrapper);

        return {
            wrapper,
            videoElement,
            audioElement,
            userId,
            userName: userName || `User-${userId}`,
            videoStream: null,
            audioStream: null,
            hasVideo: false,
            hasAudio: false
        };
    }

    updateRemoteUserDisplay(remoteUser) {
        const videoStatus = remoteUser.wrapper.querySelector('.video-status');
        const audioStatus = remoteUser.wrapper.querySelector('.audio-status');

        if (videoStatus) {
            videoStatus.textContent = remoteUser.hasVideo ? '📹 Đang phát video' : '❌ Không có video';
            videoStatus.className = `video-status ${remoteUser.hasVideo ? 'active' : 'inactive'}`;
        }

        if (audioStatus) {
            audioStatus.textContent = remoteUser.hasAudio ? '🎤 Đang phát audio' : '🔇 Không có audio';
            audioStatus.className = `audio-status ${remoteUser.hasAudio ? 'active' : 'inactive'}`;
        }

        // Hiển thị/ẩn video element dựa trên trạng thái video
        remoteUser.videoElement.style.display = remoteUser.hasVideo ? 'block' : 'none';
    }

    async resumeConsumer(consumerId) {
        return new Promise((resolve, reject) => {
            this.socket.emit('resumeConsumer', {
                eventId: this.currentEventId,
                consumerId
            }, (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve();
                }
            });
        });
    }

    removeProducer(producerId) {
        const consumer = this.consumers.get(producerId);
        if (consumer) {
            consumer.close();
            this.consumers.delete(producerId);
        }
    }

    removeConsumer(consumerId) {
        const consumer = this.consumers.get(consumerId);
        if (consumer) {
            consumer.close();
            this.consumers.delete(consumerId);
        }
    }

    removeRemoteUser(socketId) {
        const remoteUser = this.remoteUsers.get(socketId);
        if (remoteUser) {
            if (remoteUser.videoStream) {
                remoteUser.videoStream.getTracks().forEach(track => track.stop());
            }
            if (remoteUser.audioStream) {
                remoteUser.audioStream.getTracks().forEach(track => track.stop());
            }
            remoteUser.wrapper.remove();
            this.remoteUsers.delete(socketId);
        }
    }

    clearRemoteUsers() {
        this.remoteUsers.forEach((remoteUser, socketId) => {
            this.removeRemoteUser(socketId);
        });
        this.remoteUsers.clear();
    }

    stopAllMedia() {
        this.stopVideo();
        this.stopAudio();

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
            this.localVideo.srcObject = null;
        }

        this.clearRemoteUsers();

        // Đóng tất cả consumers
        this.consumers.forEach(consumer => consumer.close());
        this.consumers.clear();

        // Đóng transports
        if (this.producerTransport) {
            this.producerTransport.close();
            this.producerTransport = null;
        }
        if (this.consumerTransport) {
            this.consumerTransport.close();
            this.consumerTransport = null;
        }

        // Reset device
        this.device = null;
    }

    updateConnectionStatus(status, message) {
        this.connectionStatus.textContent = message;
        this.connectionStatus.className = `status ${status}`;
    }

    updateEventStatus(status, message) {
        this.eventStatus.textContent = message;
        this.eventStatus.className = `status ${status}`;
    }

    log(message, type = 'info') {
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;

        this.logs.appendChild(logEntry);
        this.logs.scrollTop = this.logs.scrollHeight;
    }

    clearLogs() {
        this.logs.innerHTML = '';
    }
}

// Khởi tạo client khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    window.videoCallClient = new VideoCallClient();
});