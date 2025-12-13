import { useEffect, useState } from "react";
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  StreamTheme,
  CallControls,
  SpeakerLayout,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import styles from "./EventScreen.module.css";

const apiKey = "qsd9ycemzu8m";
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjhmZjUxYmNhOGI0OTllMjYwNmFiNTYzIn0.GwvbULdf_boyXgs5gwvaUx27FVfCO5qB3iL433NzxCw";
const userId = "68ff51bca8b499e2606ab563";
const callId = "test-call";

export default function EventScreen() {
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);

  useEffect(() => {
    const initializeCall = async () => {
      const user = {
        id: userId,
        name: "Test User",
      };

      const videoClient = new StreamVideoClient({
        apiKey,
        user,
        token,
      });
      setClient(videoClient);

      const newCall = videoClient.call("default", callId);
      await newCall.join({ create: true });
      setCall(newCall);
    };

    initializeCall();

    return () => {
      if (call) {
        call.leave();
      }
      if (client) {
        client.disconnectUser();
      }
    };
  }, []);

  if (!client || !call) {
    return <div className={styles.loading}>Loading video call...</div>;
  }

  return (
    <div className={styles.container}>
      <StreamVideo client={client}>
        <StreamTheme>
          <StreamCall call={call}>
            <SpeakerLayout />
            <CallControls />
          </StreamCall>
        </StreamTheme>
      </StreamVideo>
    </div>
  );
}
