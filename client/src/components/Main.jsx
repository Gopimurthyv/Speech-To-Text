import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../Utils/supabase";
import { RefreshCcw, Trash2 } from "lucide-react"; 
import { motion } from "framer-motion";

const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 }
};

const Main = () => {
    const [audioFile, setAudioFile] = useState(null);
    const [recording, setRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [transcriptions, setTranscriptions] = useState([]);
    const [currentTranscription, setCurrentTranscription] = useState("No Transcription Yet.");
    const [errorMessage, setErrorMessage] = useState("");

    const mediaRecorderRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchTranscriptions();
    }, []);

    const resetAudioSection = () => {
        setAudioFile(null);
        setAudioUrl(null);
        setCurrentTranscription("No Transcription Yet.");
        setErrorMessage("");

        if (fileInputRef.current) {
            fileInputRef.current.value = ""; 
        }
    };

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

        // Restrict large files (e.g., max 5MB)
        if (file && file.size > 5 * 1024 * 1024) {
            setErrorMessage("File size too large. Max limit is 5MB.");
            return;
        }

        setErrorMessage(""); 
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

        if (loading) return;

        setLoading(true);
        setCurrentTranscription("Processing...");

        const formData = new FormData();
        formData.append("audio", audioFile);

        try {
            const response = await fetch("https://server-ruby-seven.vercel.app/transcribe", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (response.ok && result.transcript) {
                setCurrentTranscription(result.transcript);
                saveToDatabase(audioFile.name, result.transcript);
            } else {
                console.error("❌ Transcription error:", result.error || "Unknown error");
                setCurrentTranscription("Error transcribing audio.");
            }
        } catch (error) {
            console.error("❌ Network error:", error);
            setCurrentTranscription("Error transcribing audio.");
        } finally {
            setLoading(false);
        }
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
        <motion.div 
            className="container mx-auto p-6 flex flex-col lg:flex-row items-start gap-6"
            initial="hidden" 
            animate="visible" 
            variants={containerVariants}
        >
            {/* Audio Transcription */}
            
            <motion.div 
                className="w-full lg:w-1/2 p-8 rounded-2xl shadow-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white relative"
                whileHover={{ scale: 1.02 }}
            >
                <h1 className="text-4xl font-extrabold text-center">Audio Transcription</h1>
                
                {errorMessage && <p className="text-red-500 mt-2 text-center">{errorMessage}</p>}
                
                <div className="mt-6 bg-white/20 backdrop-blur-lg p-6 rounded-lg border border-white/30 shadow-lg ">
                    <div className="flex items-center gap-3">
                        <input 
                            type="file" 
                            accept="audio/*"
                            ref={fileInputRef} 
                            className="flex-1 p-3 rounded-lg bg-white text-gray-800 font-medium shadow-md focus:ring-2 focus:ring-blue-300"
                            onChange={handleFileChange} 
                        />

                        <motion.button
                            onClick={resetAudioSection}
                            className=" text-blue-500 rounded-xl shadow-lg hover:!bg-blue-600 hover:!text-white active:scale-95 transition-all duration-200 flex items-center justify-center"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                        >
                            <RefreshCcw size={24} />
                        </motion.button>
                    </div>
                        {audioUrl && (
                            <motion.audio 
                                controls 
                                className="w-full mt-4 rounded-lg shadow-lg" 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                transition={{ duration: 0.5 }}
                            >
                                <source src={audioUrl} type="audio/wav" />
                            </motion.audio>
                        )}
                </div>
                
                <div className="mt-6 flex flex-col gap-4">
                    <motion.button 
                        onClick={recording ? stopRecording : startRecording} 
                        className={`w-full font-semibold py-3 rounded-xl shadow-lg transition-all duration-300 ${recording ? "!bg-red-500 hover:!bg-red-600 !text-white" : "!bg-green-500 hover:!bg-green-600 !text-white active:scale-95"}`}
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                    >
                        {recording ? "Stop Recording" : "Record Audio"}
                    </motion.button>
                    <motion.button 
                        onClick={transcribeAudio} 
                        className="w-full !bg-yellow-400 text-gray-900 font-semibold py-3 rounded-xl shadow-lg hover:!bg-yellow-500 active:scale-95 transition-all duration-200"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                    >
                        {loading ? `Processing...` : "Transcribe Audio"}
                    </motion.button>
                </div>
                
                <motion.div 
                    className="mt-6 p-6 bg-white/20 backdrop-blur-lg rounded-lg border border-white/30 shadow-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <p className="text-lg font-medium">{currentTranscription}</p>
                </motion.div>
            
            </motion.div>
            
            {/* Transcription History */}
            
            <motion.div 
                className="w-full lg:w-1/2 p-8 rounded-2xl shadow-2xl bg-gradient-to-br from-gray-800 to-gray-900 text-white relative min-h-full"
                whileHover={{ scale: 1.02 }}
            >
                <h2 className="text-3xl font-extrabold text-center tracking-wide">Previous Transcriptions</h2>
                <div className="mt-6 p-6 bg-white/20 backdrop-blur-lg rounded-lg border border-white/30 shadow-md lg:max-h-[400px] lg:overflow-y-auto">
                    {transcriptions.length > 0 ? (
                        transcriptions.map((item, index) => (
                            <motion.div 
                                key={index} 
                                className="bg-white/20 backdrop-blur-md p-4 rounded-lg shadow-lg border-l-4 border-purple-400 hover:!border-purple-600 transition-all duration-300 mb-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                            >
                                <h3 className="text-lg font-semibold text-purple-600 overflow-x-clip">{item.audioName}</h3>
                                <p className="text-gray-200 mt-2">{item.transcription}</p>
                                <Trash2 
                                    onClick={() => deleteTranscription(item.id)}  
                                    className="absolute top-3 right-3 text-red-600 hover:text-red-300 cursor-pointer active:scale-110 transition-all duration-200"
                                    size={20} 
                                />
                            </motion.div>
                        ))
                    ) : (
                        <p className="text-gray-300 text-center">No transcriptions available.</p>
                    )}
                </div>
            </motion.div>

        </motion.div>
    );
};

export default Main;
