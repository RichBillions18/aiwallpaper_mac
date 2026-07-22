"use client";

import { useEffect, useState } from "react";

import { UserButton } from "@clerk/nextjs";

interface Props {
  credits?: number;
}

export default function ({ credits: creditsFromParent }: Props) {
  const [credits, setCredits] = useState(0);
  const displayCredits =
    creditsFromParent !== undefined ? creditsFromParent : credits;

  const fetchUserInfo = async () => {
    const response = await fetch("/api/get-user-info", {
      method: "POST",
    });
    const { data } = await response.json();

    console.log("userinfo", data);

    if (data && data.credits) {
      setCredits(data.credits.left_credits);
    }
  };

  useEffect(() => {
    if (creditsFromParent !== undefined) {
      return;
    }
    fetchUserInfo();
  }, [creditsFromParent]);

  return (
    <header>
      <div className="h-auto w-screen">
        <nav className="font-inter mx-auto h-auto w-full max-w-[1600px] lg:relative lg:top-0">
          <div className="flex flex-row items-center px-6 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-4 xl:px-20">
            <a
              href="/"
              className="flex-1 text-xl font-medium flex items-center"
            >
              <span className="font-bold text-primary text-2xl">
                AI Wallpaper
              </span>
            </a>
            <a href="/pricing">付费</a>
            <div className="flex-1"></div>
            <p
              className={
                displayCredits <= 0 ? "text-amber-600 font-medium" : undefined
              }
            >
              credits: {displayCredits}
            </p>
            <div className="flex flex-row items-center lg:flex lg:flex-row lg:space-x-3 lg:space-y-0">
              <div className="hidden md:block mr-8">
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
            <a href="#" className="absolute right-5 lg:hidden"></a>
          </div>
        </nav>
      </div>
    </header>
  );
}
