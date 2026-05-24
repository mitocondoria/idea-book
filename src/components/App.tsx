import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Box, Button, Center, Text, Image, NumberInput } from '@chakra-ui/react';
import "../styles/App.css";
import ReactMarkdown from 'react-markdown';
import book1Url from "../assets/book1.png";
import book2Url from "../assets/book2.png";

export const BaseURL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

type IdeaPhase = "idle" | "generating" | "revealed";

const TEXT_BOX_MIN_WIDTH = 280;
const FLOATING_BOOK_WIDTH = 300;

function App() {
  const [text, setText] = useState("テキストが出力されます");
  const [book1Left, setLeft] = useState(0);
  const [book2Right, setRight] = useState(0);
  const [hideBooks, setHideBooks] = useState(false);
  const [phase, setPhase] = useState<IdeaPhase>("idle");
  const book1 = useRef<HTMLImageElement>(null);
  const book2 = useRef<HTMLImageElement>(null);
  const textBox = useRef<HTMLDivElement>(null);
  const flipTimeline = useRef<gsap.core.Timeline | null>(null);
  const [usedKanji, setUsedKanji] = useState<string[]>([]);
  const isGenerating = phase === "generating";
  const [inputValue, setInputValue] = useState("0");
  const [limitCount, setLimitCount] = useState<string | null>("10");
  const [cooldown, setCooldown] = useState<string | null>("0");


  useEffect(() => {
    if (!book1.current || !book2.current) return;

    const tweens = [
      gsap.fromTo(book1.current, { y: 2 }, { duration: 4, y: 22, yoyo: true, repeat: -1, ease: "power4.inOut" }),
      gsap.fromTo(book1.current, { rotateZ: -10 }, { duration: 4, rotateZ: 14, yoyo: true, repeat: -1, ease: "power2.inOut" }),
      gsap.fromTo(book2.current, { y: -3 }, { duration: 3, y: 17, yoyo: true, repeat: -1, ease: "power4.inOut" }),
      gsap.fromTo(book2.current, { rotateZ: -15 }, { duration: 5, rotateZ: 10, yoyo: true, repeat: -1, ease: "power2.inOut" }),
    ];

    return () => {
      tweens.forEach((tween) => tween.kill());
    };
  }, []);


  useEffect(() => {
    const observedTextBox = textBox.current;
    if (!observedTextBox) return;

    const updateBookPosition = () => {
      if (!textBox.current) return;
      const rect = textBox.current.getBoundingClientRect();
      setHideBooks(rect.width <= TEXT_BOX_MIN_WIDTH);

      if (book1.current) {
        setLeft(rect.left - FLOATING_BOOK_WIDTH - 100);
      }

      if (book2.current) {
        setRight(rect.right + 100);
      }
    };

    updateBookPosition();

    const resizeObserver = new ResizeObserver(() => {
      updateBookPosition();
    });

    resizeObserver.observe(observedTextBox);
    window.addEventListener("resize", updateBookPosition);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateBookPosition);
    };
  }, []);

  useEffect(() => {
    if (!textBox.current) return;

    const flipPages = gsap.utils.toArray<HTMLElement>(".flip-page", textBox.current);
    const resultPage = textBox.current.querySelector<HTMLElement>(".result-page");

    flipTimeline.current?.kill();
    flipTimeline.current = null;

    if (phase === "generating") {
      gsap.set(resultPage, { autoAlpha: 0, y: 10 });
      gsap.set(flipPages, {
        opacity: 1,
        rotationY: 0,
        transformOrigin: "left center",
      });

      const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.08 });

      flipPages.forEach((page, index) => {
        timeline.fromTo(
          page,
          { rotationY: 0, opacity: 1 },
          {
            rotationY: -180,
            duration: 0.5,
            ease: "power2.inOut",
          },
          index * 0.12
        );
      });
      flipTimeline.current = timeline;

      return () => {
        timeline.kill();
        if (flipTimeline.current === timeline) {
          flipTimeline.current = null;
        }
      };
    }

    gsap.set(flipPages, { opacity: 0, rotationY: 0 });

    if (phase === "revealed") {
      gsap.fromTo(
        resultPage,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" }
      );
    } else {
      gsap.set(resultPage, { autoAlpha: 0, y: 10 });
    }
  }, [phase]);

  const judgeInputNum = (v: string) => {
    console.log(v);
    console.log(parseInt(v, 10));
    if (isNaN(parseInt(v, 10))) {
      return setInputValue("1");
    }
    const max = 100;
    const min = 1;
    if (parseInt(v, 10) > max) {
      setInputValue(max.toString());
      return;
    }
    if (parseInt(v, 10) < min) {
      setInputValue(min.toString());
      return;
    }
    setInputValue(v);
  }

  const getIdea = async () => {
    if (isGenerating || isNaN(parseInt(inputValue))) return;

    setPhase("generating");
    try {
      const res = await fetch(`${BaseURL}/api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count: inputValue
        }),
      });

      const data = await res.json();
      const remain = res.headers.get("RateLimit-Remaining");
      if (remain) {
        setLimitCount(remain);
      } else {
        setLimitCount("エラー");
      }
      const reset = res.headers.get("RateLimit-Reset");
      if (reset) {
        setCooldown(reset);
      } else {
        setCooldown("エラー");
      }
      setText(data.text);
      if (data.kanjis) {
        setUsedKanji(data.kanjis);
      }
      if (data.phase) {
        setPhase(data.phase)
      }

    } catch (error) {
      setText("エラーが発生しました");
    } finally {
      setPhase("revealed");
    }
  };


  return (
    <><Box className="bg">
      <Image src={book1Url}
        position="absolute"
        display={hideBooks ? "none" : "block"}
        className="floating-book"
        top="20%"
        left={`${book1Left}px`}
        ref={book1} />
      <Image src={book2Url}
        position="absolute"
        display={hideBooks ? "none" : "block"}
        className="floating-book"
        top="55%"
        left={`${book2Right}px`}
        ref={book2} />
      <Center minH="100vh" px={4} position="relative" zIndex={1}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={8}
          textAlign="center">
          <NumberInput.Root
            size={"md"}
            defaultValue="1"
            backgroundColor="#e0ffff"
            borderRadius="10px"
            overflow="hidden"
            clampValueOnBlur
            min={1}
            max={100}
            value={inputValue}
            onValueChange={(v) => { judgeInputNum(v.value) }}>
            <NumberInput.Control />
            <NumberInput.Input />
          </NumberInput.Root>
          <Box
            backgroundColor="#e0ffff"
            borderRadius="lg"
            width="58vw"
            opacity="0.7"
            min-width="280px"
            max-width="760px"
            height="10vh"
            min-height="75px"
            max-height="800px"
            alignItems="center"
            justifyContent="center"
            overflow="hidden">
            <Text fontSize="20px">{phase != "revealed" ? "未設定" : "選択した単語"}</Text>
            <Text fontSize="30px">{phase != "revealed" ? "" : usedKanji.join()}</Text>
          </Box>
          <Box
            className={`idea-book idea-book--${phase}`}
            aria-live="polite"
            ref={textBox}>
            <Box className="book-pages">
              <Box className="book-page book-page--left" />
              <Box className="book-page book-page--right" />
              {phase != "revealed" && <Box className="book-spine" />}
              <Box className="result-page">
                <ReactMarkdown>{text}</ReactMarkdown>
              </Box>
              <Box className="flip-stack">
                {[0, 1, 2, 3, 4].map((pageNumber) => (
                  <Box key={pageNumber} className="flip-page" />
                ))}
              </Box>
              <Text className="book-status">{isGenerating ? "生成中..." : ""}</Text>
            </Box>
          </Box>
          <Button onClick={getIdea} disabled={isGenerating}>{isGenerating ? "生成中..." : "アイデアを出す"}</Button>
          <Box
            width="20%"
            height="14%"
            minWidth="75px"
            minHeight="51px"
            backgroundColor="#e0ffff"
            borderRadius="10px"
            textAlign="center">
            <Text fontSize="15px">残り回数: {limitCount || "エラーです"}</Text>
            <Text fontSize="15px">リセットまで: {cooldown || "エラーです"}秒</Text>
          </Box>
        </Box>
      </Center >
    </Box >
    </>
  );
}

export default App;
