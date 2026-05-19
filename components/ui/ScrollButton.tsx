"use client";

import { useEffect, useState } from "react";

export default function ScrollButton() {
  const [visible, setVisible] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("down");

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;

      const viewportHeight = window.innerHeight;

      const fullHeight = document.documentElement.scrollHeight;

      // Hide button if page is not long enough
      const isScrollable = fullHeight > viewportHeight + 300;

      if (!isScrollable) {
        setVisible(false);
        return;
      }

      const nearTop = scrollTop < 250;

      const nearBottom = scrollTop + viewportHeight >= fullHeight - 250;

      if (nearTop) {
        setVisible(true);
        setDirection("down");
      } else if (nearBottom) {
        setVisible(true);
        setDirection("up");
      } else {
        setVisible(false);
      }
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll);

    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);

      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const handleClick = () => {
    if (direction === "down") {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={direction === "down" ? "Scroll to bottom" : "Scroll to top"}
      className={`
        fixed
        bottom-6
        right-6
        z-50
        flex
        h-12
        w-12
        items-center
        justify-center
        rounded-full
        bg-black/80
        backdrop-blur-md
        border border-neutral-200
        text-white
        shadow-lg
        transition-all
        duration-300
        hover:scale-110
        hover:shadow-xl

        ${visible ? "opacity-100 translate-y-0 scale-100" : "pointer-events-none opacity-0 translate-y-4 scale-90"}
      `}
    >
      <span className="text-xl">{direction === "down" ? "↓" : "↑"}</span>
    </button>
  );
}
