"use client";
import { signOut, useSession, signIn } from "next-auth/react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import styles from "../page.module.css";

interface HeaderProps {
  showSearchBar?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
}

export default function Header({
  showSearchBar = false,
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
}: HeaderProps) {
  const session = useSession();
  const [displayName, setDisplayName] = useState<string>();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  let profilePic: string | undefined;
  if (session.data?.user) {
    if ("picture" in session.data.user) {
      const { picture }: any = session.data.user;
      profilePic = picture;
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (session?.data) {
      const fetchUserInfo = async () => {
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
          setDisplayName(spotifyInformation.display_name);
        }
      };

      fetchUserInfo();
    }
  }, [session]);

  return (
    <div className={styles.topBar}>
      <div className={styles.logo}>Jukify</div>

      {showSearchBar && (
        <form
          className={styles.searchBar}
          onSubmit={(evt) => {
            evt.preventDefault();
            onSearchSubmit?.();
          }}
        >
          <Image
            alt="search"
            onClick={onSearchSubmit}
            src={"/search.png"}
            className={styles.searchIcon}
            height={18}
            width={18}
          />
          <input
            placeholder="What do you want to listen to?"
            value={searchValue}
            className={styles.searchBarInput}
            onChange={(event) => {
              onSearchChange?.(event.target.value);
            }}
            type="text"
          />
        </form>
      )}

      <div className={styles.userMenu}>
        {session && (
          <>
            {session?.status === "authenticated" ? (
              <div className={styles.dropdown} ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={styles.userButton}
                >
                  {profilePic ? (
                    <Image
                      src={profilePic}
                      alt="profile"
                      width={32}
                      height={32}
                      className={styles.profilePic}
                    />
                  ) : (
                    <div className={styles.profileIcon}>
                      {displayName?.charAt(0) || "U"}
                    </div>
                  )}
                </button>
                {dropdownOpen && (
                  <div className={styles.dropdownMenu}>
                    <button
                      onClick={() => signOut()}
                      className={styles.dropdownItem}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn("spotify", { callbackUrl: "/" })}
                className={styles.loginButton}
              >
                Login
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
