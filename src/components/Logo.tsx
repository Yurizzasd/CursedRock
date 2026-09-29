// Marca CursedRock: minério amaldiçoado em pixel art própria.
// Mapa 14×14 — K borda, S pedra, L luz, R redstone, W brasa.
const ROWS = [
  'KKKKKKKKKKKKKK',
  'KSSSLLSSSSSSSK',
  'KSLSSSSSSSSSSK',
  'KSSSSRRSSSSSSK',
  'KSSSRWRSSSRRSK',
  'KSSSWRRSSSRWRK',
  'KSSSRRSSSS RRSK'.replace(' ', ''),
  'KSSLLSSSSSSLSK',
  'KSLSSSSSSRSSSK',
  'KSSSSSRRSSSSSK',
  'KSSSSRWRRSSSSK',
  'KSSLSSSSRRSSSK',
  'KSSSSSSSSSSSSK',
  'KKKKKKKKKKKKKK',
];

const COLORS: Record<string, string> = {
  K: '#050505',
  S: '#141414',
  L: '#2e2e2e',
  R: '#d40f28',
  W: '#ff6b85',
};

export function LogoMark() {
  const cells: React.ReactNode[] = [];
  ROWS.forEach((row, y) => {
    [...row].forEach((c, x) => {
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.01} height={1.01} fill={COLORS[c]} />);
    });
  });
  return (
    <svg viewBox="0 0 14 14" shapeRendering="crispEdges" aria-hidden="true">
      {cells}
    </svg>
  );
}
