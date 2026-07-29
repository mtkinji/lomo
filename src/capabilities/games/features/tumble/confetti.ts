export type ConfettiPiece = {
  id: number;
  left: `${number}%`;
  originTop: `${number}%`;
  delay: number;
  duration: number;
  burstX: number;
  burstY: number;
  driftX: number;
  fallY: number;
  turn: string;
};

const burstOrigins = [
  { left: 18, top: 42 },
  { left: 38, top: 28 },
  { left: 61, top: 34 },
  { left: 82, top: 46 },
  { left: 50, top: 56 },
] as const;

export function createConfettiPieces(): ConfettiPiece[] {
  return Array.from({ length: 40 }, (_, id) => {
    const origin = burstOrigins[id % burstOrigins.length];
    const direction = id % 2 === 0 ? -1 : 1;
    const spread = 42 + ((id * 29) % 104);

    return {
      id,
      left: `${origin.left + ((id * 13) % 9) - 4}%`,
      originTop: `${origin.top + ((id * 7) % 7) - 3}%`,
      delay: (id % 8) * 30,
      duration: 2350 + ((id * 83) % 650),
      burstX: direction * spread,
      burstY: -(48 + ((id * 17) % 92)),
      driftX: direction * (spread + 24 + ((id * 11) % 64)),
      fallY: 940 + ((id * 31) % 260),
      turn: `${direction * (480 + ((id * 47) % 500))}deg`,
    };
  });
}
