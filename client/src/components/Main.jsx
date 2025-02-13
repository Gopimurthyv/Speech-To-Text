import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../Utils/Supabase";
import { Trash2 } from "lucide-react"; 

const Main = () => {
    const [audioFile, setAudioFile] = useState(null);
    const [recording, setRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [transcriptions, setTranscriptions] = useState([]);
    const [currentTranscription, setCurrentTranscription] = useState("No Transcription Yet.");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        fetchTranscriptions();
    }, []);

    const fetchTranscriptions = async () => {
        const { data, error } = await supabase.from("audioTranscription").select("id, audioName, transcription").order("id", { ascending: false });;
        if (error) {
            console.error("Error fetching transcriptions:", error) 
        } else {
            setTranscriptions(data);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];

         // Validation: Only allow audio files
        if (file && !file.type.startsWith("audio/")) {
            setErrorMessage("Invalid file type. Please upload an audio file.");
            return;
        }

        // Validation: Restrict large files (e.g., max 5MB)
        if (file && file.size > 5 * 1024 * 1024) {
            setErrorMessage("File size too large. Max limit is 5MB.");
            return;
        }

        setErrorMessage(""); // Reset error
        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(file));
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                setAudioUrl(URL.createObjectURL(audioBlob));
                
                const fileName = "Recorded_Audio_" + new Date().getTime() + ".webm";
                const audioFile = new File([audioBlob], fileName, { type: "audio/webm" });

                setAudioFile(audioFile);
            };

            mediaRecorderRef.current.start();
            setRecording(true);
        
        } catch (error) {
            console.error("Error starting recording:", error);
            setErrorMessage("Failed to start recording.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    const transcribeAudio = async () => {
        if (!audioFile) {
            alert("Please upload or record an audio file first");
            return;
        }

        // Prevent duplicate API calls
        if (loading) return;

        setLoading(true);
        setCurrentTranscription("Processing...")

        const formData = new FormData();
        formData.append("audio", audioFile);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "http://localhost:3030/transcribe", true);

        xhr.onload = async () => {
            setLoading(false);

            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                console.log("Transcription Response:", response);

                const audioName = audioFile.name ? audioFile.name : "Recorded_Audio_" + new Date().getTime();
                const transcript = response.transcript || "No transcription found.";

                setCurrentTranscription(transcript);

                if (transcript) {
                    await saveToDatabase(audioName, transcript);
                }

            } else {
                console.error("Transcription error:", xhr.responseText);
                setCurrentTranscription("Error transcribing audio.");
            }
        };

        xhr.onerror = () => {
            setLoading(false);
            setCurrentTranscription("Error transcribing audio.");
        };

        xhr.send(formData);
    };

    const saveToDatabase = async (audioName, transcription) => {

        const { data: existingTranscriptions } = await supabase.from("audioTranscription").select("audioName, transcription");

        // Check if both the filename and the transcription already exist
        const isDuplicate = existingTranscriptions?.some(
            (t) => t.audioName === audioName && t.transcription === transcription
        );

        if (isDuplicate) {
            console.log("Duplicate transcription detected. Skipping insert.");
            return;
        }


        const { error } = await supabase
            .from("audioTranscription")
            .insert([{ audioName, transcription }]);

        if (error) {
            console.error("Error saving to database:", error);
            alert("Failed to save transcription to database.");
        } else {
            fetchTranscriptions();
            alert("Transcription saved successfully!");
        }
    };

    const deleteTranscription = async (id) => {
        const { error } = await supabase.from("audioTranscription").delete().eq("id", id);
        if (error) {
            console.error("Error deleting transcription:", error);
        } else {
            setTranscriptions(transcriptions.filter(item => item.id !== id));
        }
    };

    return (
        <div className="container mx-auto p-6 flex flex-col lg:flex-row items-start gap-6">
            
            {/* Audio Transription */}
            <div className="w-full lg:w-1/2 p-8 rounded-2xl shadow-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white relative">
                
                <h1 className="text-4xl font-extrabold text-center">Audio Transcription</h1>

                 {/* Error Message */}
                {errorMessage && <p className="text-red-500 mt-2 text-center">{errorMessage}</p>}

                 {/* Uploading Audio and Preview Audio */}
                <div className="mt-6 bg-white/20 backdrop-blur-lg p-6 rounded-lg border border-white/30 shadow-lg">
                    
                    <input type="file" accept="audio/*" 
                        className="w-full p-3 rounded-lg bg-white text-gray-800 font-medium shadow-md focus:ring-2 focus:ring-blue-300"
                        onChange={handleFileChange} 
                    />
                    
                    {audioUrl && (
                        <audio controls className="w-full mt-4 rounded-lg shadow-lg">
                            <source src={audioUrl} type="audio/wav" />
                        </audio>
                    )}
                
                </div>

                 {/* Recorder Button & Transcription Button */}
                <div className="mt-6 flex flex-col gap-4">
                    
                    <button 
                        onClick={recording ? stopRecording : startRecording} 
                        className={`w-full font-semibold py-3 rounded-xl shadow-lg transition-all duration-300 ${recording ? "!bg-red-500 hover:!bg-red-600 !text-white" : "!bg-green-500 hover:!bg-green-600 !text-white active:scale-95"}`}
                    >
                            {recording ? "Stop Recording" : "Record Audio"}
                    </button>
                    
                    <button 
                        onClick={transcribeAudio} 
                        className="w-full !bg-yellow-400 text-gray-900 font-semibold py-3 rounded-xl shadow-lg hover:!bg-yellow-500 active:scale-95 transition-all duration-200"
                    >
                            {loading ? `Processing...` : "Transcribe Audio"}
                    </button>
                
                </div>

                 {/* Trancrited text area */}
                <div className="mt-6 p-6 bg-white/20 backdrop-blur-lg rounded-lg border border-white/30 shadow-md">
                    <p className="text-lg font-medium">{currentTranscription}</p>
                </div>

            </div>


             {/* Previous Transcriptions Section */}
            <div className="w-full lg:w-1/2 p-8 rounded-2xl shadow-2xl bg-gradient-to-br from-gray-800 to-gray-900 text-white relative min-h-full">
                
                <h2 className="text-3xl font-extrabold text-center tracking-wide">Previous Transcriptions</h2>

                <div className="mt-6 p-6 bg-white/20 backdrop-blur-lg rounded-lg border border-white/30 shadow-md lg:max-h-[400px] lg:overflow-y-auto">
                    
                    {transcriptions.length > 0 ? (
                        transcriptions.map((item, index) => (
                            <div key={index} className="bg-white/20 backdrop-blur-md p-4 rounded-lg shadow-lg border-l-4 border-purple-400 hover:!border-purple-600 transition-all duration-300 mb-4">
                                
                                <h3 className="text-lg font-semibold text-purple-600 overflow-x-clip">{item.audioName}</h3>
                                
                                <p className="text-gray-200 mt-2">{item.transcription}</p>
                                
                                <Trash2 
                                    onClick={() => deleteTranscription(item.id)}  
                                    className="absolute top-3 right-3 text-red-600 hover:text-red-300 cursor-pointer active:scale-110 transition-all duration-200"
                                    size={20} 
                                />

                            </div>
                        ))
                    ) : (
                        <p className="text-gray-300 text-center">No transcriptions available.</p>
                    )}

                </div>

            </div>

        </div>
    );
};

export default Main;
