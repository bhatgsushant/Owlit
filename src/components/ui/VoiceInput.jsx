import React, { useState, useEffect, useRef } from 'react';
import { Mic, StopCircle, Send, Loader } from 'lucide-react';
import { parseVoiceInput } from '../../utils/voice';

const VoiceInput = ({ onComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Your browser does not support Speech Recognition. Try Chrome or Edge.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-GB';

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript(prev => prev + finalTranscript + interimTranscript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
        };
    }, []);

    const handleToggleRecording = () => {
        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            setTranscript('');
            recognitionRef.current.start();
        }
        setIsRecording(!isRecording);
    };

    const handleProcess = () => {
        if (!transcript) return;
        setIsProcessing(true);
        const parsedData = parseVoiceInput(transcript);
        setTimeout(() => {
            onComplete(parsedData);
            setIsProcessing(false);
        }, 1000); // Simulate processing time
    };

    return (
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl w-full max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Voice Mode</h2>
            <p className="text-gray-300 mb-6">Press the button and start speaking your receipt items.<br/> e.g., "2 bananas 1.50 pounds Tesco"</p>
            
            <div className="relative mb-6">
                <textarea 
                    value={transcript} 
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full h-40 p-4 rounded-lg bg-black/20 text-white border-2 border-transparent focus:border-green-500 focus:outline-none"
                    placeholder="Your spoken receipt will appear here..."
                />
            </div>

            <div className="flex justify-center items-center gap-4">
                <button 
                    onClick={handleToggleRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors text-white ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                    {isRecording ? <StopCircle size={40} /> : <Mic size={40} />}
                </button>
                <button 
                    onClick={handleProcess}
                    disabled={isProcessing || !transcript}
                    className="bg-green-500 text-white py-3 px-8 rounded-full font-semibold hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center">
                    {isProcessing ? <><Loader size={20} className="animate-spin mr-2"/> Processing...</> : <><Send size={20} className="mr-2"/> Process</>}
                </button>
            </div>
        </div>
    );
};

export default VoiceInput;