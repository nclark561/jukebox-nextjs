import { Track } from "@spotify/web-api-ts-sdk";

require("dotenv").config();
const { PORT } = process.env;

const io = require("socket.io")(PORT, {
  cors: { origin: ["http://localhost:3000", "http://127.0.0.1:3000"] },
});

interface Vote {
  voted: string;
  user: string;
}

interface QueueTrack extends Track {
  votes: Vote[];
  voteCount: number
}

interface Queue {
  id: string;
  accessToken: string;
  timeoutId: any;
  queue: QueueTrack[];
}

const queues: Queue[] = [];

const sortQueue = (queueId: string) => {
  const sortingQueue = queues.find((e) => e.id === queueId);
  if (!sortingQueue?.queue) return
  if (sortingQueue?.queue.length > 1) {
    sortingQueue?.queue.sort((a, b) => {
      let aCount = 0;
      let bCount = 0;
      b.votes.forEach((curr) => {
        if (curr.voted === "upvoted") {
          bCount++;
          return;
        } else if (curr.voted === "downvoted") {
          bCount--;
          return
        }
      });
      b.voteCount = bCount
      a.votes.forEach((curr) => {
        if (curr.voted === "upvoted") {
          aCount++;
          return;
        } else if (curr.voted === "downvoted") {
          aCount--;
          return
        }
      });
      a.voteCount = aCount
      console.log(bCount, aCount)
      return bCount - aCount
    });
    console.log(sortingQueue)
  } else {
    let currVoteCount = 0
    sortingQueue.queue[0].votes.forEach((curr: Vote) => {
      if (curr.voted === "upvoted") currVoteCount++
      if (curr.voted === "downvoted") currVoteCount--
    })
    sortingQueue.queue[0].voteCount = currVoteCount
  }
};

const fetchPlayerData = async (accessToken: string) => {
  try {
    const response: any = await fetch("https://api.spotify.com/v1/me/player", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      }
    })
    if (response) {
      const currStatus = await response.json()
      return currStatus
    }
    return null
  } catch (err) {
    console.error(err)
    return null
  }
}

const playCurrSong = async (accessToken: string) => {
  fetch(`https://api.spotify.com/v1/me/player/play`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "PUT",
    })
      .catch(err => console.error(err))
}

const pauseCurrSong = async (accessToken: string) => {
  fetch(`https://api.spotify.com/v1/me/player/pause`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "PUT",
    })
      .catch(err => console.error(err))
}

const playNextSong =  async (currQueue: Queue, socket: any) => {
  if (currQueue.queue.length > 0) {
    const nextSong = currQueue.queue[0]
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play`, {
        method: "Put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${currQueue.accessToken}`,
        },
        body: JSON.stringify({
          uris: [nextSong.uri]
        })
      })
      const currPlaying = currQueue.queue.shift()
      console.log(currPlaying)
      socket.to(currQueue.id).emit("queue-sent", { queue: currQueue.queue, currPlaying })
      socket.emit("queue-sent", { queue: currQueue.queue, currPlaying })
      currQueue.timeoutId = setTimeout(() => playNextSong(currQueue, socket), nextSong.duration_ms);
    } catch (err) {
      console.error(err)
    }
  } else {
    socket.to(currQueue.id).emit("queue-sent", { queue: currQueue.queue, message: 'queue has ended' })
    socket.emit("queue-sent", { queue: currQueue.queue, message: 'queue has ended' })
  }
}

io.on("connection", (socket: any) => {
  console.log(socket.id);
  socket.on("create-queue", (room: string, queue: QueueTrack[], accessToken: string, cb: any) => {
    if (queues.filter((q: any) => q.id === room).length > 0) {
      cb({ errorMsg: "room name already taken" });
    } else {
      socket.join(room);

      queues.push({ id: room, accessToken, queue, timeoutId: null });
      console.log(queues);

      cb({
        message: `Created ${room}`,
        room: queues.filter((q: any) => q.id === room)[0].id,
      });
    }
  });
  socket.on("join-queue", (room: string, cb: any) => {
    socket.join(room);
    const queue = queues.filter((q: any) => q.id === room)[0].queue
    cb({
      message: `Joined ${room}`,
      queue,
      room: room
    });
  });
  socket.on("delete-queue", (room: string, cb: any) => {
    const delQueue = queues.map((e: any) => e.id).indexOf(room);
    const currQueue = queues.find(e => e.id === room)
    clearTimeout(currQueue?.timeoutId)
    queues.splice(delQueue, 1);
    socket.to(room).emit("queue-ended", { message: `${room} queue ended`})
    socket.leave(room)
    cb({ message: `Ended ${room}`, queues });
  });
  socket.on("vote", (room: string, song: QueueTrack, vote: string, user: string, cb: any) => {
    const currQueue = queues.find(e => e.id === room)
    const currSong = currQueue?.queue.find(e => e.id === song.id)
    let currVote = currSong?.votes.find(e => e.user === user)
    if (currVote) {
      currVote.voted = vote
    } else {
      currSong?.votes.push({user: user, voted: vote})
      currVote = currSong?.votes.find(e => e.user === user)
    }
    sortQueue(room)
    console.log(currQueue?.queue)
    socket.to(room).emit("queue-sent", { queue: currQueue?.queue })
    cb({ queue: currQueue?.queue, voted: currVote?.voted })
  })
  socket.on("add-song", (room: string, song: Track, cb: any) => {
    if (!room) {
      cb({ errorMsg: 'room doesnt exist '})
      return
    }
    const currQueue = queues.find(e => e.id === room)
    if (!currQueue) {
      cb({ errorMsg: 'queue does not exist' })
      return
    }
    if (currQueue?.queue.filter(e => e.id === song.id).length > 0) {
      cb({ errorMsg: 'song already in queue' })
      return
    }
    const currSong = { ...song, votes: [], voteCount: 0}
    currQueue?.queue.push(currSong)
    sortQueue(room)
    socket.to(room).emit("queue-sent", { queue: currQueue.queue })
    cb({ message: 'Song Added', queue: currQueue?.queue })
  })
  socket.on("get-queue", (room: string, cb: any) => {
    const currQueue = queues.filter((e: Queue) => e.id === room)[0]
    if (!currQueue) {
      cb({ errorMsg: 'queue does not exist'})
      return
    }
    socket.join(room)
    cb({ message: 'queue recieved', queue: currQueue.queue})
  })
  socket.on("play-queue", async (room: string, cb: any) => {
    const currQueue = queues.filter((e: Queue) => e.id === room)[0]
    const currPlaying = await fetchPlayerData(currQueue.accessToken)
    if (currPlaying) {
      if(!currPlaying.is_playing) await playCurrSong(currQueue.accessToken)
      socket.to(currQueue.id).emit("curr-sent", { current: currPlaying })
      socket.emit("curr-sent", { current: currPlaying })
      const wait = () => new Promise(resolve => currQueue.timeoutId = setTimeout(resolve, currPlaying.item.duration_ms - currPlaying.progress_ms))
      await wait()
    }
    if (currQueue.queue.length < 1) {
      cb({ message: 'queue is empty', currPlaying })
      return
    }
    playNextSong(currQueue, socket)
    cb({ message: 'successfully played', queue: currQueue.queue })
  })
  socket.on("pause-queue", (room: string, cb: any) => {
    const currQueue = queues.filter((e: Queue) => e.id === room)[0]
    pauseCurrSong(currQueue.accessToken)
    clearTimeout(currQueue.timeoutId)
    cb({ message: 'music paused' })
  })
  socket.on("skip-song", (room: string, cb: any) => {
    const currQueue = queues.filter((e: Queue) => e.id === room)[0]
    if (currQueue.queue.length < 1) {
      cb({ message: 'queue is empty' })
      return
    }
    clearTimeout(currQueue.timeoutId)
    playNextSong(currQueue, socket)
    cb({ message: "song skipped"})
  })
  socket.on("get-status", async (room: string, cb: any) => {
    const currQueue = queues.filter((e: Queue) => e.id === room)[0]
    const currPlaying = await fetchPlayerData(currQueue.accessToken)
    cb({ isPlaying: currPlaying.is_playing })
  })
  socket.on("get-vote", (room: string, song: QueueTrack, user:string, cb: any) => {
    const currQueue = queues.filter((e: Queue) => e.id === room)[0]
    const currSong = currQueue?.queue.find(e => e.id === song.id)
    let currVote = currSong?.votes.find(e => e.user === user)
    if (currVote) {
      cb({ voted: currVote.voted, voteCount: currSong?.voteCount })
    } else {
      cb({ voted: 'neutral', voteCount: currSong?.voteCount })
    }
  })
  socket.on("leave-room", (room: string) => {
    socket.leave(room)
  })
  socket.on("disconnecting", () => {
    console.log(socket.rooms);
  });
});