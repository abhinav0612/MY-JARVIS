import React, { useState, useRef, useEffect } from 'react';

const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

function App() {
  const [statusText, setStatusText] = useState("JARVIS ONLINE. Click core to speak.");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // JARVIS Speech Synthesis
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name.includes('Natural') || v.name.includes('David')) || voices[0];
      
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = 1.05;
      utterance.pitch = 0.95;

      utterance.onstart = () => { setIsSpeaking(true); setStatusText(text); };
      utterance.onend = () => { setIsSpeaking(false); setStatusText("Listening for command..."); };

      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Toggle Voice Recording
  const toggleListening = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    } else {
      audioChunksRef.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result;
            setIsProcessing(true);
            setStatusText("Processing command...");

            if (ipcRenderer) {
              const botReply = await ipcRenderer.invoke('process-audio', base64Audio);
              setIsProcessing(false);
              speak(botReply);
            } else {
              setIsProcessing(false);
              speak("Browser test mode active.");
            }
          };
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
        setStatusText("Listening...");
      } catch (err) {
        console.error("Mic error:", err);
        setStatusText("Microphone access denied.");
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>J.A.R.V.I.S.</span>
        <button onClick={() => window.close()} style={styles.closeBtn}>×</button>
      </div>

      <div style={styles.hudBody}>
        {/* Futuristic Arc Reactor / Voice Orb */}
        <div 
          onClick={toggleListening}
          style={{
            ...styles.orb,
            boxShadow: isRecording 
              ? '0 0 40px #ef4444, inset 0 0 20px #ef4444' 
              : isProcessing 
              ? '0 0 40px #f59e0b, inset 0 0 20px #f59e0b' 
              : isSpeaking 
              ? '0 0 40px #10b981, inset 0 0 20px #10b981' 
              : '0 0 30px #6366f1, inset 0 0 15px #6366f1',
            borderColor: isRecording ? '#ef4444' : isProcessing ? '#f59e0b' : isSpeaking ? '#10b981' : '#6366f1'
          }}
        >
          <div style={styles.innerCore}>
            {isRecording ? '🎙️' : isProcessing ? '⚡' : isSpeaking ? '🔊' : '✨'}
          </div>
        </div>

        <div style={styles.statusDisplay}>
          {statusText}
        </div>

        <div style={styles.hint}>
          Click the core to speak • Press <span style={styles.key}>Ctrl+Shift+J</span> anywhere
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    background: '#09090b',
    color: '#f4f4f5',
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    border: '2px solid #3f3f46',
    borderRadius: '16px',
    overflow: 'hidden'
  },
  header: {
    height: '36px',
    background: '#18181b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    cursor: 'grab',
    WebkitAppRegion: 'drag',
    borderBottom: '1px solid #27272a'
  },
  title: {
    fontSize: '12px',
    letterSpacing: '2px',
    fontWeight: 'bold',
    color: '#a1a1aa'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#a1a1aa',
    fontSize: '16px',
    cursor: 'pointer',
    WebkitAppRegion: 'no-drag',
  },
  hudBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    textAlign: 'center',
    gap: '24px'
  },
  orb: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '3px solid',
    background: '#11111b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  innerCore: {
    fontSize: '32px',
  },
  statusDisplay: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#e4e4e7',
    maxWidth: '300px',
    minHeight: '45px',
    lineHeight: '1.4'
  },
  hint: {
    fontSize: '11px',
    color: '#71717a'
  },
  key: {
    background: '#27272a',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#d4d4d8'
  }
};

export default App;