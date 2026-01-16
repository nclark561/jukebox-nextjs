"use client";
import styles from "../queue.module.css";
import SongDisplay from "./songDisplay";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useEffect, useState } from "react";
import QueueForm from "./QueueForm";

interface SuccessfulResponse {
  message: string;
  room: string;
  queue: QueueTrack[]
}

interface VoteProps {
  socket: any;
  queue: QueueTrack[];
  setQueue: React.Dispatch<React.SetStateAction<QueueTrack[]>>;
  queueRoom: string
  setQueueRoom: React.Dispatch<React.SetStateAction<string>>
  searchQuery: string
}

export default function Vote(props: VoteProps) {
  const { socket, queue, setQueue, queueRoom, setQueueRoom, searchQuery } = props;
  const session = useSession();
  const [animationToggle, setAnimation] = useState<boolean>(false)
  const [isHost, setIsHost] = useState(false)
  const [queueForm, setQueueForm] = useState("")

  // Filter queue based on search query
  const filteredQueue = queue.filter((song) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      song.name.toLowerCase().includes(searchLower) ||
      song.artists?.some(artist => artist.name.toLowerCase().includes(searchLower))
    );
  });

  useEffect(() => {
    let room = localStorage.getItem("room")
    if (room && room !== "undefined") setQueueRoom(room)
  }, [])

  useEffect(() => {
    let host = localStorage.getItem("host")
    if (host === "true") setIsHost(true)
  }, [queueRoom])

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        flexDirection: "column",
        height: "100%",
        alignItems: "center",
      }}
    >

      <LayoutGroup>
        <div className={styles.queueContainer}>
          <AnimatePresence initial={false}>
            {queueRoom ? filteredQueue.map((song) => (
              <SongDisplay
                key={song.id}
                song={song}
                socket={socket}
                setQueue={setQueue}
                queueRoom={queueRoom}
              />
            )) : (
              <h2 style={{fontSize:"30px"}} className="text-center">Not Currently in a queue!</h2>
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
      <div style={{ display: "flex", justifyContent: "space-evenly" }}>
        <button
          disabled={queueRoom}
          className={!queueRoom ? styles.queueButton : styles.queueButtonO}
          onClick={() => {
            setQueueForm('Create')
          }}
        >
          Create Queue
        </button>
        <button
         disabled={queueRoom}
         className={!queueRoom ? styles.queueButton : styles.queueButtonO}
          onClick={() => {
            setQueueForm('Join')
          }}
        >
          Join Queue
        </button>
        <button
          disabled={!isHost}
          className={isHost ? styles.queueButton : styles.queueButtonO}
          onClick={() => {
            socket.emit(
              "delete-queue",
              queueRoom,
              (response: Partial<SuccessfulResponse>) => {
                console.log(response);
                setQueue([])
                localStorage.removeItem("room")
                localStorage.removeItem("host")
                setIsHost(false)
                setQueueRoom("")
              }
            );
            localStorage.removeItem("room")
          }}
        >
          End Queue
        </button>
      </div>
      {queueForm && <QueueForm session={session} queueForm={queueForm} setQueueForm={setQueueForm} queue={queue} setQueue={setQueue} socket={socket} setQueueRoom={setQueueRoom}></QueueForm>}
    </div>
  );
}
