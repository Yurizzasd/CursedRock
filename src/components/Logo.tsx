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
  K: '#100d0e',
  S: '#2b2426',
  L: '#4a3f3c',
  R: '#c14a38',
  W: '#f0a184',
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
