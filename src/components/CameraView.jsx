import React, { useRef, useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';

export default function CameraView({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const streamRef = useRef(null);

  const stopStream = () => {
    const current = streamRef.current || stream;
    if (current) {
      current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
  };

  useEffect(() => {
    async function getCameraStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
        setStream(stream);
      } catch (err) {
        console.error("Error accessing camera: ", err);
        alert("Could not access the camera. Please make sure you have given the necessary permissions.");
        onClose();
      }
    }

    getCameraStream();

    return () => {
      stopStream();
    };
  }, []);

  const handleCapture = () => {
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    if (video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        const capturedFile = new File([blob], `capture-${new Date().toISOString()}.jpg`, { type: 'image/jpeg' });
        onCapture(capturedFile);
        stopStream();
        onClose();
      }, 'image/jpeg');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="relative bg-black rounded-2xl overflow-hidden w-full max-w-3xl aspect-video">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <div className="absolute top-4 right-4">
            <button onClick={onClose} className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors">
                <X size={24} />
            </button>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <button onClick={handleCapture} className="bg-white text-black p-4 rounded-full shadow-lg hover:bg-gray-200 transition-colors">
                <Camera size={32} />
            </button>
        </div>
      </div>
    </div>
  );
}
