"use client";
import BarTextValue from "@/components/bar-text-value";
import * as d3 from "d3";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { data } from "../lib/valuation-data";

const N_RANKED_BRANDS = 15;
const N_KEYFRAMES_PER_POINT = 10;

const height = 400;
const width = 800;
const marginTop = 16;
const marginLeft = 16;
const marginRight = 6;
const barSize = 48;

const duration = 250;

interface Datum {
  date: string;
  name: string;
  category: string;
  value: number;
}

export default function Home() {
  const dataToJson = useMemo(
    () =>
      (JSON.parse(data) as Datum[]).map((d) => ({
        ...d,
        date: new Date(d.date),
      })),
    []
  );

  //Sort all data by the date
  const dateValues = useMemo(
    () =>
      Array.from(
        d3.rollup(
          dataToJson,
          ([d]) => d.value,
          (d) => d.date,
          (d) => d.name
        )
      )
        .map(([date, data]) => [new Date(date), data] as const)
        .sort(([a], [b]) => d3.ascending(a, b)),
    [dataToJson]
  );

  const companyNames = useMemo(
    () => new Set(dataToJson.map((d) => d.name)),
    [dataToJson]
  );

  const rank = useCallback(
    (value: (name: string) => number) => {
      const data = Array.from(companyNames, (name) => ({
        name,
        value: value(name),
      }))
        .sort((a, b) => d3.descending(a.value, b.value))
        .map((d, i) => ({
          ...d,
          rank: Math.min(N_RANKED_BRANDS, i),
        }));

      return data;
    },
    [companyNames]
  );

  const keyframes = useMemo(() => {
    const keyframes: [Date, ReturnType<typeof rank>][] = [];

    d3.pairs(dateValues).forEach(([[ka, a], [kb, b]], index, arr) => {
      for (let i = 0; i < N_KEYFRAMES_PER_POINT; ++i) {
        const t = i / N_KEYFRAMES_PER_POINT;
        keyframes.push([
          new Date(+ka * (1 - t) + +kb * t),
          rank((name) => (a.get(name) || 0) * (1 - t) + (b.get(name) || 0) * t),
        ]);
      }

      if (index === arr.length - 1) {
        keyframes.push([new Date(kb), rank((name) => b.get(name) || 0)]);
      }
    });

    return keyframes;
  }, [dateValues, rank]);

  const y = useMemo(() => {
    return d3
      .scaleBand<number>()
      .domain(d3.range(N_RANKED_BRANDS + 1))
      .rangeRound([
        marginTop,
        marginTop + barSize * (N_RANKED_BRANDS + 1 + 0.1),
      ])
      .padding(0.1);
  }, []);

  const [keyFrameIndex, setKeyFrameIndex] = useState(0);

  const currentKeyFrame = useMemo(() => {
    return keyframes[keyFrameIndex];
  }, [keyFrameIndex, keyframes]);

  const x = useMemo(() => {
    return d3
      .scaleLinear()
      .range([marginLeft, width - marginRight])
      .domain([0, currentKeyFrame[1][0].value]);
  }, [currentKeyFrame]);

  const [canReplay, setCanReplay] = useState(false);

  const interval = useRef<ReturnType<typeof setInterval>>();

  const resetIndex = useCallback(() => {
    setKeyFrameIndex((prev) => {
      if (prev >= keyframes.length - 1) {
        clearInterval(interval?.current);
        return prev;
      }
      return prev + 1;
    });
  }, [keyframes.length]);

  useEffect(() => {
    if (!canReplay) return;
    interval.current = setInterval(() => {
      resetIndex();
    }, duration);

    return () => {
      clearInterval(interval?.current);
    };
  }, [keyframes.length, canReplay, resetIndex]);

  const [keyframeDate, keyframeData] = currentKeyFrame;

  const axisRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!axisRef?.current) return;
    const axis = d3
      .axisTop(x)
      .ticks(width / 160, undefined)
      .tickSizeOuter(0)
      .tickSizeInner(-barSize * (N_RANKED_BRANDS + y.padding()));

    const axisEl = d3.select(axisRef?.current);
    axisEl.call(axis);
    axisEl.select(".tick:first-of-type text").remove();
    axisEl.selectAll(".tick:not(:first-of-type) line").attr("stroke", "white");
    axisEl.select(".domain").remove();
  }, [x, y]);

  return (
    <main>
      <div className="py-3 px-3">
        <h4 className="text-center text-2xl font-bold">
          A racing bar chart of the valuations of top brands from 2000 to 2019
          in millions of dollars
        </h4>
      </div>
      <div className="flex flex-col lg:flex-row flex-wrap">
        <div className="px-3 mt-7 w-[300px] md:w-[500px] lg:w-[700px] xl:w-[1000px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className={`max-w-full h-auto transition-all duration-[${duration}ms] ease-linear`}
          >
            <g>
              {keyframeData
                .slice(0, N_RANKED_BRANDS)
                .map(({ rank, name, value }) => {
                  return (
                    <rect
                      key={name}
                      height={y.bandwidth()}
                      x={x(0)}
                      y={y(rank)}
                      width={x(value) - x(0)}
                      className={`transition-all duration-[${duration}ms] ease-linear fill-blue-300`}
                    ></rect>
                  );
                })}
            </g>
            <g
              ref={axisRef}
              style={{ transform: `translate(0,${marginTop}px)` }}
              className={`transition-all duration-[${duration}ms] ease-linear`}
            ></g>
            <g
              className="font-sans font-bold text-xs tabular-nums"
              style={{ textAnchor: "end" }}
            >
              {keyframeData
                .slice(0, N_RANKED_BRANDS)
                .map((data, index, array) => {
                  return (
                    <BarTextValue
                      key={data?.name}
                      duration={duration}
                      data={data}
                      index={index}
                      array={array}
                      x={x}
                      y={y}
                    />
                  );
                })}
            </g>
            <text
              className={`font-bold text-[32px] font-sans tabular-nums`}
              style={{ textAnchor: "end" }}
              x={width - 6}
              dy={"0.32em"}
              y={height - 20}
            >
              {d3.utcFormat("%Y")(keyframeDate)}
            </text>
          </svg>
        </div>

        <div className="ml-7 px-3 py-7">
          <button
            className="bg-blue-600 text-white px-3.5 py-1.5 rounded-md"
            onClick={() => {
              console.log("click");
              setCanReplay(true);
              clearInterval(interval.current);
              interval.current = setInterval(() => {
                resetIndex();
              }, duration);
              setKeyFrameIndex(0);
            }}
          >
            Start Replay
          </button>
        </div>
      </div>
    </main>
  );
}
