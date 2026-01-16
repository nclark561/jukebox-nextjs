"use client";
import { useState } from "react";

interface SuccessfulResponse {
  message: string;
  room: string;
  queue: QueueTrack[];
}

interface ErrorResponse {
  errorMsg: string;
}

interface QueueFormProps {
  socket: any;
  queue: QueueTrack[];
  setQueue: React.Dispatch<React.SetStateAction<QueueTrack[]>>;
  setQueueRoom: React.Dispatch<React.SetStateAction<string>>;
  queueForm: string;
  setQueueForm: React.Dispatch<React.SetStateAction<string>>;
  session: any;
}

export default function QueueForm({
  socket,
  queue,
  setQueue,
  setQueueRoom,
  queueForm,
  setQueueForm,
  session,
}: QueueFormProps) {
  const [roomInput, setRoomInput] = useState("");

  const handleSumbit = (queueForm: string) => {
    if (queueForm === "Create") {
      if (session.data?.user) {
        if ("accessToken" in session.data?.user) {
          socket.emit(
            "create-queue",
            roomInput,
            queue,
            session.data?.user?.accessToken,
            (response: SuccessfulResponse | ErrorResponse) => {
              console.log(response);
              if ("errorMsg" in response) alert(response.errorMsg);
              if ("room" in response) {
                localStorage.setItem("room", response.room);
                localStorage.setItem("host", "true");
                setQueueRoom(response.room);
                setQueueForm("");
              }
            }
          );
        }
      }
    } else if (queueForm === "Join") {
      socket.emit("join-queue", roomInput, (response: SuccessfulResponse) => {
        console.log(response.message);
        setQueue(response.queue);
        localStorage.setItem("room", response.room);
        setQueueRoom(response.room);
        setQueueForm("");
      });
    } else {
      alert("issue with queue");
      setQueueForm("");
    }
  };

  return (
    <div className="fixed top-0 left-0 w-[100vw] h-[100vh] flex justify-center items-center backdrop-blur-md bg-black/40 animate-fadeIn z-50">
      <form
        className="flex flex-col relative p-8 bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl shadow-2xl border border-gray-700 min-w-[350px] animate-slideUp"
        onSubmit={(e) => {
          e.preventDefault();
          handleSumbit(queueForm);
        }}
      >
        <h2 className="text-2xl font-bold mb-6 text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          {queueForm} Queue
        </h2>
        <input
          className="px-4 py-3 text-white bg-gray-800/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
          name="room-name"
          placeholder="Enter Queue Name"
          onChange={(e) => setRoomInput(e.target.value)}
          value={roomInput}
        ></input>
        <button 
          type="submit" 
          className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-purple-500/50 hover:scale-105 active:scale-95 transition-all duration-300 hover:from-purple-600 hover:to-pink-600"
        >
          {`${queueForm} Queue`}
        </button>
        <button
          type="button"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-all duration-200 hover:rotate-90"
          onClick={() => setQueueForm("")}
        >
          ✕
        </button>
      </form>
    </div>
  );
}
