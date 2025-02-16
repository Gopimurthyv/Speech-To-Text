# Speech-to-Text App

## 🚀 About the Project

This is a **Speech-to-Text** application built using **React.js** for the frontend and **Express.js** with **Deepgram API** for the backend. The app allows users to upload audio files or record live audio and get accurate transcriptions in real-time.

## 🌟 Features

- 🎤 **Upload & Transcribe**: Upload an audio file and receive an accurate text transcription.
- 🔴 **Live Transcription**: Convert speech to text in real-time while recording audio.
- 📂 **Save & Retrieve**: Store transcriptions securely using **Supabase**.
- 🔑 **Authentication**: Users must log in to access their saved transcriptions.
- 🎨 **Beautiful UI**: A modern and responsive UI built with **Tailwind CSS**.

## 🛠️ Tech Stack

### **Frontend**

- **React.js** (with Vite)
- **Tailwind CSS**
- **ShadCN UI** (for beautiful components)

### **Backend**

- **Express.js** (Node.js server)
- **Deepgram API** (for speech recognition)
- **Supabase** (authentication & database)
- **Multer** (for handling file uploads)

### **Deployment**

- **Frontend**: Vercel
- **Backend**: Vercel
- **Database**: Supabase

## 📂 Project Structure

```
Speech-To-Text/
│── client/          # Frontend (React)
│── server/          # Backend (Express)
│   ├── api/
│   │   ├── index.js  # Main Express API
│   ├── package.json
│   ├── vercel.json
│── README.md
```

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```sh
git clone https://github.com/Gopimurthyv/Speech-To-Text.git
cd Speech-To-Text
```

### 2️⃣ Setup Frontend

```sh
cd client
npm install
npm run dev
```

### 3️⃣ Setup Backend

```sh
cd server
npm install
npm start
```

## 📜 License

This project is **open-source** and free to use.

## 🙌 Contributing

Feel free to fork this repository and contribute to the project.
