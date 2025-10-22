// client.js
const socket = io('http://localhost:3000', { // Thay đổi URL nếu cần
    // auth: { token: 'YOUR_TOKEN' } // Sẽ lấy từ input
    autoConnect: false // Chỉ kết nối khi bấm Join
});
const device = new mediasoupClient.Device();

let producerTransport;
let consumerTransport;
let audioProducer;
let videoProducer;

// Map để lưu consumer theo producerId
// Key: producerId, Value: mediasoup consumer
const consumers = new Map();

// --- DOM Elements ---
const btnJoin = document.getElementById('btnJoin');
const btnLeave = document.getElementById('btnLeave');
const btnToggleMic = document.getElementById('btnToggleMic');
const btnToggleWebcam = document.getElementById('btnToggleWebcam');
const inputEventId = document.getElementById('eventId');
const inputToken = document.getElementById('token');
const localVideo = document.getElementById('localVideo');
const videosContainer = document.getElementById('videos-container');
const logDiv = document.getElementById('logs');

// --- Helper Functions ---
function log(message) {
    console.log(message);
    const p = document.createElement('p');
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logDiv.appendChild(p);
    logDiv.scrollTop = logDiv.scrollHeight; // Auto scroll
}

function addRemoteTrack(track, producerId, userId, fullName) {
    log(`Adding remote ${track.kind} track from ${fullName} (producer: ${producerId})`);
    let videoElement = document.getElementById(`vid-${producerId}`);
    let audioElement = document.getElementById(`aud-${producerId}`);

    if (track.kind === 'video') {
        if (!videoElement) {
            videoElement = document.createElement('video');
            videoElement.id = `vid-${producerId}`;
            videoElement.autoplay = true;
            videoElement.playsinline = true;
            videoElement.setAttribute('data-userid', userId);
            videoElement.setAttribute('data-fullname', fullName);
            const wrapper = document.createElement('div');
            wrapper.appendChild(document.createTextNode(`${fullName} (Video)`));
            wrapper.appendChild(videoElement);
            videosContainer.appendChild(wrapper);
        }
        videoElement.srcObject = new MediaStream([track]);
    } else if (track.kind === 'audio') {
        if (!audioElement) {
            audioElement = document.createElement('audio');
            audioElement.id = `aud-${producerId}`;
            audioElement.autoplay = true;
            // Không cần hiển thị audio element, nhưng cần add vào DOM để chạy
            // videosContainer.appendChild(audioElement); // Hoặc một div ẩn
        }
        audioElement.srcObject = new MediaStream([track]);
    }
}

function removeRemoteProducer(producerId) {
    log(`Removing remote tracks for producer ${producerId}`);
    const videoElement = document.getElementById(`vid-${producerId}`);
    const audioElement = document.getElementById(`aud-${producerId}`);
    if (videoElement) videoElement.parentElement.remove(); // Xóa cả div bao ngoài
    if (audioElement) audioElement.remove();
    // Đóng consumer liên quan
    const consumer = consumers.get(producerId);
    if (consumer) {
        consumer.close();
        consumers.delete(producerId);
    }
}

// --- Socket Event Handlers ---
socket.on('connect', () => {
    log('Socket connected successfully!');
});

socket.on('disconnect', (reason) => {
    log(`Socket disconnected: ${reason}`);
    // Reset UI
    btnJoin.disabled = false;
    btnLeave.disabled = true;
    btnToggleMic.disabled = true;
    btnToggleWebcam.disabled = true;
    localVideo.srcObject = null;
    videosContainer.innerHTML = '';
    // Đóng các transport nếu còn
    if (producerTransport) producerTransport.close();
    if (consumerTransport) consumerTransport.close();
    producerTransport = null;
    consumerTransport = null;
    audioProducer = null;
    videoProducer = null;
    consumers.clear();
});

socket.on('connect_error', (err) => {
    log(`Socket connection error: ${err.message}`);
    alert(`Connection failed: ${err.message}. Check token/server URL.`);
    btnJoin.disabled = false;
});

socket.on('event:error', ({ message }) => {
    log(`Event Error: ${message}`);
    alert(`Server error: ${message}`);
});

socket.on('event:join_success', async ({ eventId, title, existingProducers }) => {
    log(`Successfully joined event: ${title} (${eventId})`);
    btnJoin.disabled = true;
    btnLeave.disabled = false;
    btnToggleMic.disabled = false;
    btnToggleWebcam.disabled = false;

    try {
        log('Initializing Mediasoup Device...');
        // 1. Get Router RTP Capabilities
        const routerRtpCapabilities = await new Promise((resolve, reject) => {
            socket.emit('getRouterRtpCapabilities', { eventId }, (capabilities) => {
                if (capabilities.error) reject(new Error(capabilities.error));
                else resolve(capabilities);
            });
        });
        log('Router capabilities received.');

        // 2. Load Device
        await device.load({ routerRtpCapabilities });
        log('Device loaded.');

        // 3. Create Send Transport
        log('Creating Send Transport...');
        const sendTransportParams = await new Promise((resolve, reject) => {
            socket.emit('createWebRtcTransport', { eventId, type: 'producer' }, (params) => {
                if (params.error) reject(new Error(params.error));
                else resolve(params);
            });
        });
        producerTransport = device.createSendTransport(sendTransportParams);
        log(`Send Transport created (id: ${producerTransport.id})`);

        // Send Transport Events
        producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            log('Send Transport connecting...');
            socket.emit('connectWebRtcTransport', {
                eventId,
                transportId: producerTransport.id,
                dtlsParameters
            }, ({ connected, error }) => {
                if (connected) {
                    log('Send Transport connected!');
                    callback();
                } else {
                    log(`Send Transport connection failed: ${error}`);
                    errback(new Error(error));
                }
            });
        });

        producerTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
            log(`Producing ${kind}...`);
            socket.emit('produce', {
                eventId,
                kind,
                rtpParameters,
                appData // Gửi appData nếu có
            }, ({ id, error }) => {
                if (id) {
                    log(`${kind} Producer created (id: ${id})`);
                    callback({ id }); // Trả về producer id cho transport
                } else {
                    log(`Produce ${kind} failed: ${error}`);
                    errback(new Error(error));
                }
            });
        });

        producerTransport.on('connectionstatechange', (state) => {
            log(`Send Transport state: ${state}`);
            // Có thể xử lý reconnect ở đây nếu 'disconnected' hoặc 'failed'
        });

        // 4. Create Recv Transport
        log('Creating Recv Transport...');
        const recvTransportParams = await new Promise((resolve, reject) => {
            socket.emit('createWebRtcTransport', { eventId, type: 'consumer' }, (params) => {
                if (params.error) reject(new Error(params.error));
                else resolve(params);
            });
        });
        consumerTransport = device.createRecvTransport(recvTransportParams);
        log(`Recv Transport created (id: ${consumerTransport.id})`);

        // Recv Transport Events
        consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            log('Recv Transport connecting...');
            socket.emit('connectWebRtcTransport', {
                eventId,
                transportId: consumerTransport.id,
                dtlsParameters
            }, ({ connected, error }) => {
                if (connected) {
                    log('Recv Transport connected!');
                    callback();
                } else {
                    log(`Recv Transport connection failed: ${error}`);
                    errback(new Error(error));
                }
            });
        });

        consumerTransport.on('connectionstatechange', (state) => {
            log(`Recv Transport state: ${state}`);
            // Có thể xử lý reconnect
        });

        // 5. Start Producing (Mic & Webcam)
        await startProducing();

        // 6. Consume existing producers
        log(`Found ${existingProducers.length} existing producers.`);
        for (const { producerId, userId, fullName } of existingProducers) {
            await consumeProducer(eventId, producerId, userId, fullName);
        }

    } catch (error) {
        log(`Error during initialization: ${error.message}`);
        socket.emit('event:leave', { eventId }); // Tự động rời nếu init lỗi
    }
});

// Nghe producer mới từ người khác
socket.on('newProducer', async ({ producerId, userId, fullName, kind, appData }) => {
    log(`New producer detected: ${fullName} (id: ${producerId}, kind: ${kind})`);
    const eventId = inputEventId.value; // Lấy eventId hiện tại
    if (!eventId || !consumerTransport) {
        log('Cannot consume, not in event or recv transport not ready.');
        return;
    }
    await consumeProducer(eventId, producerId, userId, fullName);
});

// Nghe tín hiệu producer bị đóng từ server
socket.on('producerClosed', ({ producerId, userId }) => {
    log(`Producer ${producerId} from user ${userId} was closed on server.`);
    removeRemoteProducer(producerId);
});

// Nghe tín hiệu consumer bị đóng từ server (ví dụ do producer đóng)
socket.on('consumerClosed', ({ consumerId }) => {
    log(`Server notified consumer ${consumerId} is closed.`);
    // Tìm producerId tương ứng với consumerId này để xóa khỏi UI
    let producerIdToRemove = null;
    consumers.forEach((c, pId) => {
        if (c.id === consumerId) {
            producerIdToRemove = pId;
            c.close(); // Đóng consumer ở client
            consumers.delete(pId);
        }
    });
    if (producerIdToRemove) {
        removeRemoteProducer(producerIdToRemove);
    }
});

socket.on('event:user_joined', ({ userId, fullName, socketId }) => {
    log(`User joined: ${fullName} (socket: ${socketId})`);
    // Chỉ log, việc hiển thị video/audio sẽ dựa vào 'newProducer'
});

socket.on('event:user_left', ({ userId, fullName, socketId }) => {
    log(`User left: ${fullName} (socket: ${socketId})`);
    // Tìm và xóa tất cả video/audio của user này
    consumers.forEach((consumer, producerId) => {
        if (consumer.appData && consumer.appData.peerId === socketId) { // Giả sử lưu socketId vào appData khi consume
            removeRemoteProducer(producerId);
        }
    });
    // Hoặc cách khác: Lấy element theo data-userid
    const videosToRemove = videosContainer.querySelectorAll(`video[data-userid="${userId}"]`);
    videosToRemove.forEach(v => v.parentElement.remove());
    const audiosToRemove = videosContainer.querySelectorAll(`audio[data-userid="${userId}"]`);
    audiosToRemove.forEach(a => a.remove());

});

// --- Actions ---
async function startProducing() {
    if (!device.loaded) {
        log('Device not loaded yet.');
        return;
    }
    if (!producerTransport) {
        log('Producer transport not ready.');
        return;
    }

    try {
        log('Requesting media devices...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localVideo.srcObject = stream; // Hiển thị video của chính mình

        // Produce Audio
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            log('Starting audio producer...');
            audioProducer = await producerTransport.produce({
                track: audioTrack,
                // codecOptions: { opusStereo: 1, opusDtx: 1 } // Tùy chọn codec
                appData: { mediaType: 'audio' } // Gửi kèm thông tin
            });
            log('Audio producer created.');
            btnToggleMic.textContent = 'Mute Mic';
            btnToggleMic.onclick = toggleMic;
        }

        // Produce Video
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            log('Starting video producer...');
            videoProducer = await producerTransport.produce({
                track: videoTrack,
                encodings: [ // Ví dụ về Simulcast (gửi nhiều độ phân giải)
                    { maxBitrate: 100000, scaleResolutionDownBy: 4 },
                    { maxBitrate: 300000, scaleResolutionDownBy: 2 },
                    { maxBitrate: 900000, scaleResolutionDownBy: 1 }
                ],
                codecOptions: { videoGoogleStartBitrate: 1000 },
                appData: { mediaType: 'webcam' }
            });
            log('Video producer created.');
            btnToggleWebcam.textContent = 'Pause Video';
            btnToggleWebcam.onclick = toggleWebcam;
        }

    } catch (error) {
        log(`Error getting media or producing: ${error.message}`);
        // Có thể hiển thị lỗi cho người dùng
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            alert('Bạn cần cấp quyền truy cập camera và micro!');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            alert('Không tìm thấy camera hoặc micro.');
        }
        // Thử chỉ bật mic nếu cam lỗi?
    }
}

async function consumeProducer(eventId, producerId, userId, fullName) {
    if (!consumerTransport || !device.canProduce('video')) { // Kiểm tra device sẵn sàng chưa
        log(`Cannot consume producer ${producerId} yet, transport or device not ready.`);
        return;
    }
    log(`Attempting to consume producer ${producerId} from ${fullName}`);
    try {
        const { rtpCapabilities } = device; // Lấy capabilities của client
        const consumerParams = await new Promise((resolve, reject) => {
            socket.emit('consume', {
                eventId,
                producerId,
                rtpCapabilities // Gửi capabilities của client cho server
            }, (params) => {
                if (params.error) reject(new Error(params.error));
                else resolve(params);
            });
        });

        const consumer = await consumerTransport.consume({
            id: consumerParams.id,
            producerId: consumerParams.producerId,
            kind: consumerParams.kind,
            rtpParameters: consumerParams.rtpParameters,
            // Lưu lại thông tin để dễ quản lý
            appData: { peerId: /* socketId của producer */ null, userId, fullName } // Cần lấy socketId khi newProducer
        });

        consumers.set(producerId, consumer); // Lưu consumer lại
        log(`Consumer created for producer ${producerId} (kind: ${consumer.kind})`);

        // Nghe sự kiện track để hiển thị
        consumer.on('trackended', () => {
            log(`Track ended for consumer ${consumer.id}`);
            removeRemoteProducer(producerId);
        });

        consumer.on('transportclose', () => {
            log(`Transport closed for consumer ${consumer.id}`);
            removeRemoteProducer(producerId);
        });

        // Yêu cầu server resume consumer này
        log(`Requesting resume for consumer ${consumer.id}`);
        socket.emit('resumeConsumer', { eventId, consumerId: consumer.id }, ({ resumed, error }) => {
            if (resumed) {
                log(`Consumer ${consumer.id} resumed successfully.`);
                // Lấy track và hiển thị
                const { track } = consumer;
                addRemoteTrack(track, producerId, userId, fullName);
            } else {
                log(`Failed to resume consumer ${consumer.id}: ${error}`);
            }
        });

    } catch (error) {
        log(`Error consuming producer ${producerId}: ${error.message}`);
    }
}

function toggleMic() {
    if (!audioProducer) return;
    if (audioProducer.paused) {
        audioProducer.resume();
        btnToggleMic.textContent = 'Mute Mic';
        log('Microphone resumed.');
    } else {
        audioProducer.pause();
        btnToggleMic.textContent = 'Unmute Mic';
        log('Microphone paused.');
    }
    // Hoặc dùng track.enabled = false/true nếu chỉ muốn tắt/bật gửi đi mà không pause hẳn producer
    // const track = localVideo.srcObject.getAudioTracks()[0];
    // if (track) {
    //    track.enabled = !track.enabled;
    //    btnToggleMic.textContent = track.enabled ? 'Mute Mic' : 'Unmute Mic';
    //    log(`Microphone ${track.enabled ? 'enabled' : 'disabled'}.`);
    // }
}

function toggleWebcam() {
    if (!videoProducer) return;
    if (videoProducer.paused) {
        videoProducer.resume();
        btnToggleWebcam.textContent = 'Pause Video';
        log('Webcam resumed.');
    } else {
        videoProducer.pause();
        btnToggleWebcam.textContent = 'Resume Video';
        log('Webcam paused.');
    }
}

// --- Event Listeners ---
btnJoin.addEventListener('click', () => {
    const eventId = inputEventId.value.trim();
    const token = inputToken.value.trim();
    if (!eventId) {
        alert('Please enter an Event ID.');
        return;
    }
    if (!token) {
        alert('Please enter Auth Token.');
        return;
    }
    btnJoin.disabled = true; // Vô hiệu hóa nút Join khi đang xử lý
    log(`Attempting to join event: ${eventId}`);
    socket.auth = { token }; // Đặt token trước khi kết nối
    socket.connect(); // Kết nối socket
    // Sau khi kết nối thành công, emit event:join
    socket.once('connect', () => { // Dùng once để chỉ emit một lần sau khi kết nối
        socket.emit('event:join', { eventId });
    });

});

btnLeave.addEventListener('click', () => {
    const eventId = inputEventId.value;
    log(`Leaving event: ${eventId}`);
    socket.emit('event:leave', { eventId });
    // UI sẽ được reset trong sự kiện 'disconnect' hoặc bạn có thể reset ở đây
    socket.disconnect(); // Ngắt kết nối socket
});