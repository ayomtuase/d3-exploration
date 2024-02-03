import * as d3 from "d3";
import { useCallback, useEffect, useRef } from "react";

interface Data {
  rank: number;
  name: string;
  value: number;
}

const BarTextValue = ({
  data,
  index,
  array,
  x,
  y,
  duration,
}: {
  data: Data;
  index: number;
  array: Data[];
  x: d3.ScaleLinear<number, number, never>;
  y: d3.ScaleBand<number>;
  duration: number;
}) => {
  const { name, rank, value } = data;

  const tSpanRef = useRef<SVGTSpanElement>(null);

  const textTween = useCallback((a: number, b: number) => {
    const i = d3.interpolateNumber(a, b);
    return function (t: number) {
      if (!tSpanRef.current) return;
      tSpanRef.current.textContent = d3.format(",d")(i(t));
    };
  }, []);

  useEffect(() => {
    if (!tSpanRef?.current) return;

    const tSpanSelect = d3.select(tSpanRef?.current);
    tSpanSelect
      .transition()
      .duration(duration)
      .ease(d3.easeLinear)
      .tween("text", (d) =>
        textTween(array[index === 0 ? 0 : index - 1].value, value)
      );
  }, [array, index, textTween, value, duration]);

  return (
    <text
      transform={`translate(${x(value)},${y(rank)})`}
      y={y.bandwidth() / 2}
      x="-6"
      dy="-0.25em"
    >
      {name}
      <tspan
        ref={tSpanRef}
        fillOpacity={0.7}
        fontWeight={"normal"}
        dy="1.15em"
        x="-6"
      >
        {}
      </tspan>
    </text>
  );
};

export default BarTextValue;
