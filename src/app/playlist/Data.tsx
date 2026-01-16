'use client'
import { signOut, useSession, signIn } from "next-auth/react";
import { Track, Playlist } from "@spotify/web-api-ts-sdk";
import Queue from "../components/Queue";
import Header from "../components/Header";
import styles from '../page.module.css'
import Remote from "../remote";
import Image from "next/image";
// import Search from "./search";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import { debug } from "console";

const socket = io("http://localhost:5678")

export default function Home() {
    const searchParams = useSearchParams();
    const playlistId = searchParams.get("id");
    const [search, setSearch] = useState<string | undefined>();
    const [searchToggle, setSearchToggle] = useState<any>(false);
    const [queue, setQueue] = useState<QueueTrack[]>([]);
    const [image, setImage] = useState<string>();
    const [txt, setTxt] = useState<string>();
    const [style, setStyle] = useState<boolean>();
    const [displayName, setDisplayName] = useState<string>();
    const [songs, setSongs] = useState<any>()
    const [songAmount, setSongAmount] = useState<number>()
    const [name, setName] = useState<string>()


    useEffect(() => {
        const room = localStorage.getItem("room")
        if (room) {
            socket.emit("get-queue", room, (response: { message: string, queue: QueueTrack[] } | { errorMsg: string }) => {
                console.log(response)
                if ("queue" in response) setQueue(response.queue)
            })
        }
    }, [])

    async function songSearch() {
        const result = search?.replace(/\s+/g, "+");
        if (!session.data?.user) return;
        if ("accessToken" in session.data.user) {
            const response = await fetch(
                `https://api.spotify.com/v1/playlists/${playlistId}/images`,
                {
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.data?.user?.accessToken}`,
                    },
                    method: "GET",
                }
            );
            const test = await response.json().catch((err) => console.error(err));
            setImage(test[0].url);
            console.log(test, "this is a test")
        }
    }
    async function nameSearch() {
        const result = search?.replace(/\s+/g, "+");
        if (!session.data?.user) return;
        if ("accessToken" in session.data.user) {
            const response = await fetch(
                `https://api.spotify.com/v1/playlists/${playlistId}`,
                {
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.data?.user?.accessToken}`,
                    },
                    method: "GET",
                }
            );
            const test = await response.json().catch((err) => console.error(err));
            setName(test.name);
            if (test.name.length <= 20) {
                setStyle(true)
            } else {
                setStyle(false)
            }
        }
    }
    useEffect(() => {
        songSearch()
        nameSearch()
    }, [image])


    useEffect(() => {
    }, [])
    socket.on("connect", () => {
        console.log(socket.id);
    });


    const addSong = (song: Track) => {
        const room = localStorage.getItem("room")

        socket.emit("add-song", room, song, (response: { message: string, queue: QueueTrack[] } | { errorMsg: string }) => {
            console.log(response)
            if ("queue" in response) setQueue(response.queue)
            if ("errorMsg" in response) alert(response.errorMsg)
        })
    }

    async function handleClick() {
        setTxt('')
        const result = search?.replace(/\s+/g, "+")
        const response = await fetch(`https://api.spotify.com/v1/search?q=${result}&type=track`, {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.data.user.accessToken}`,
            },
            method: "GET",
        })
        const test = await response.json()
            .catch(err => console.error(err))
        // setResults(test.tracks.items)
        // console.log(test.tracks.items)
    }

    useEffect(() => {
        if (session?.data) {
            const playlists = async () => {
                if (!session.data?.user) return;
                if ("accessToken" in session.data.user) {
                    const response = await fetch(`https://api.spotify.com/v1/me `, {
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session?.data?.user?.accessToken}`,
                        },
                        method: "GET",
                    });
                    const spotifyInformation = await response
                        .json()
                        .catch((err) => console.error(err));
                    setDisplayName(spotifyInformation.display_name)
                }
            };

            playlists();
        }
    }, []);

    useEffect(() => {
        const songs = async () => {
            const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.data.user.accessToken}`,
                },
                method: "GET",
            })
            const test = await response.json()
                .catch(err => console.error(err))
            // console.log(test.tracks.items, "this is a test of songs")
            setSongs(test)
            setSongAmount(test.tracks.items.length)
        }
        songs()

    }, [])

    const session: any = useSession()
    function millisToMinutesAndSeconds(millis: number) {
        var minutes = Math.floor(millis / 60000);
        var seconds = ((millis % 60000) / 1000).toFixed(0);
        // Math.round(seconds)
        return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
    }

    const breadCrumbs = [
        { name: "Home", url: "/" },
    ]

    return (
        <main className={styles.main}>
            <div style={{ display: "flex", width: "100vw", height: "88vh" }}>
                <Queue icon={false} setSearchToggle={setSearchToggle} queue={queue} socket={socket} setQueue={setQueue} />
                <div className={styles.content}>
                    <Header showSearchBar={false} />
                    <div className={styles.row}>
                        <div className={styles.searchInput}>
                            {image && <Image style={{ paddingBottom: "30px", marginLeft: "50px" }} priority src={image} alt={''} height={250} width={250}></Image>}
                            <div className={styles.even}>
                                <div style={{ marginLeft: "3px" }} className={styles.titleSmall}>playlist</div>
                                <div className={style ? styles.songTitleLarge : styles.songTitle}>{name}</div>
                                <div>
                                    <div style={{ marginLeft: "3px" }}>{displayName} •</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.headerRow}>
                        <div>#</div>
                        <div style={{ width: "255px", textAlign: "left" }}>Title</div>
                        <div style={{ width: "175px", textAlign: "left" }}>Album</div>
                        <div style={{ width: "175px" }}></div>
                        <div style={{ width: "15px" }}></div>
                    </div>
                    <div className={styles.line}></div>
                    <div style={{ overflowY: "auto", height: "100vh", paddingBottom:"100px" }}>

                        {songs?.tracks.items?.map((item: any, index: number) => {
                            return (
                                // {item.album.images[1].url? <><> : null}
                                <div key={index} className={styles.rowSong}>
                                    <div>{index + 1}</div>
                                    <div className={styles.rowGap}>
                                        <Image alt={"something"} src={item.track.album.images[1].url} height={70} width={70}></Image>
                                        <div style={{ padding: "10px" }} className={styles.column}>
                                            <div style={{ width: "175px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.track.name}</div>
                                            <div className={styles.miniTitle}>{item.track.artists[0].name}</div>
                                        </div>
                                    </div>
                                    <div style={{ width: "175px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.track.album.name}</div>
                                    <div style={{ width: "175px" }}>{millisToMinutesAndSeconds(item.track.duration_ms)}</div>
                                    <Image onClick={() => addSong(item.track)} alt={"plus sign"} height={15} width={15} src={'/plus.png'}></Image>

                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
            <div>
                {session?.status === 'authenticated' && <Remote session={session} socket={socket} setQueue={setQueue} />}
            </div>
        </main>
    );
}
