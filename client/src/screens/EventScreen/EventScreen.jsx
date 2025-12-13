import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API from "../../API/api";
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

const apiKey = import.meta.env.VITE_STREAM_API_KEY || "qsd9ycemzu8m";

export default function EventScreen() {
  const eventId = "693d6ecba1919f42bc102065";
  const { accessToken, userID } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Use refs to track current instances
  const clientRef = useRef(null);
  const callRef = useRef(null);

  useEffect(() => {
    if (!accessToken || !userID) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    let isSubscribed = true;

    const initializeCall = async () => {
      try {
        // Get token from backend
        const response = await fetch(
          `${API}/event/${eventId}/token`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to get token");
        }

        const { token, userId } = await response.json();

        if (!isSubscribed) return;

        // Initialize Stream Video Client using getOrCreateInstance
        const user = {
          id: userId,
          name: userID || "User",
        };

        const videoClient = StreamVideoClient.getOrCreateInstance({
          apiKey,
          user,
          token,
        });
        
        clientRef.current = videoClient;
        setClient(videoClient);

        // Create and join call
        const activeCall = videoClient.call("default", eventId);
        await activeCall.join({ create: true });
        
        if (!isSubscribed) {
          // If component unmounted during join, cleanup
          await activeCall.leave();
          return;
        }
        
        callRef.current = activeCall;
        setCall(activeCall);
        setLoading(false);
      } catch (err) {
        console.error("Failed to initialize video call:", err);
        if (isSubscribed) {
          setError(err.message || "Failed to join video call");
          setLoading(false);
        }
      }
    };

    initializeCall();

    // Cleanup function
    return () => {
      isSubscribed = false;
      
      const cleanup = async () => {
        if (callRef.current) {
          try {
            await callRef.current.leave();
            console.log("Call left during cleanup");
          } catch (err) {
            if (!err.message?.includes("already been left")) {
              console.error("Error leaving call:", err);
            }
          }
          callRef.current = null;
        }
        
        if (clientRef.current) {
          try {
            await clientRef.current.disconnectUser();
            console.log("Client disconnected during cleanup");
          } catch (err) {
            console.error("Error disconnecting:", err);
          }
          clientRef.current = null;
        }
      };
      
      cleanup();
    };
  }, [eventId, accessToken, userID]);

  // Handle browser back button and navigation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (call) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [call]);

  const handleLeaveCall = async () => {
    try {
      // Leave call first
      if (callRef.current) {
        await callRef.current.leave();
        console.log("Left the call");
      }
      
      // Disconnect client
      if (clientRef.current) {
        await clientRef.current.disconnectUser();
        console.log("Disconnected from Stream");
      }
      
      // Clear refs and state
      callRef.current = null;
      clientRef.current = null;
      setCall(null);
      setClient(null);
      
      // Navigate after cleanup
      navigate(-1);
    } catch (err) {
      console.error("Error leaving call:", err);
      
      // Force cleanup on error
      callRef.current = null;
      clientRef.current = null;
      setCall(null);
      setClient(null);
      
      navigate(-1);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading video call...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  if (!client || !call) {
    return <div className={styles.loading}>Initializing...</div>;
  }

  return (
    <div className={styles.container}>
      <StreamVideo client={client}>
        <StreamTheme>
          <StreamCall call={call}>
            <div className={styles.videoWrapper}>
              <SpeakerLayout />
              <div className={styles.controlsWrapper}>
                <CallControls onLeave={handleLeaveCall} />
              </div>
            </div>
          </StreamCall>
        </StreamTheme>
      </StreamVideo>
    </div>
  );
}
