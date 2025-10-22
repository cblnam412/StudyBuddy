import { createWorker } from "mediasoup";

let mediasoupWorker = null;

export async function startMediasoupWorker() {
    try {
        mediasoupWorker = await createWorker({
            logLevel: "warn",
            logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
            rtcMinPort: 40000,
            rtcMaxPort: 49999,
        });

        console.log(`Mediasoup worker started (pid ${mediasoupWorker.pid})`);

        mediasoupWorker.on("died", () => {
            console.error("Mediasoup worker has died. Exiting in 2 seconds...");
            setTimeout(() => process.exit(1), 2000);
        });

        return mediasoupWorker;
    } catch (err) {
        console.error("Error starting Mediasoup worker:", err);
        process.exit(1);
    }
}

export const mediasoupConfig = {
    router: {
        mediaCodecs: [
            {
                kind: "audio",
                mimeType: "audio/opus",
                clockRate: 48000,
                channels: 2
            },
            {
                kind: "video",
                mimeType: "video/VP8",
                clockRate: 90000,
                parameters: {
                    "x-google-start-bitrate": 1000
                }
            },
            {
                kind: "video",
                mimeType: "video/H264",
                clockRate: 90000,
                parameters: {
                    "packetization-mode": 1,
                    "profile-level-id": "42e01f",
                    "level-asymmetry-allowed": 1,
                    "x-google-start-bitrate": 1000
                }
            }
        ]
    },

    webRtcTransport: {
        listenIps: [
            {
                ip: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0", 
                announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || null 
            }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000,
    }
};

export function getMediasoupWorker() {
    return mediasoupWorker;
}