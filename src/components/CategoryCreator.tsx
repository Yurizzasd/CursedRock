import { Link } from 'react-router-dom';
import {
  Armchair, BadgeCheck, Car, Compass, Cpu, Dices, Flame, Gauge, Ghost, Mountain,
  Package, Skull, Sparkles, Sword, Swords, Wheat, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Category, Creator } from '../types';
import { getAddonsByCreator } from '../data/repository';

const ICONS: Record<string, LucideIcon> = {
  Compass, Sword, Ghost, Cpu, Sparkles, Flame, Armchair, Car, Gauge, Wrench,
  Mountain, Skull, Zap, Swords, Wheat, Dices, Package,
};

export function CategoryCard({ category, count }: { category: Category; count: number }) {
  const Icon = ICONS[category.icon] ?? Package;
  return (
    <Link
      to={`/category/${category.id}`}
      className="cat-card"
      style={{ ['--accent' as string]: category.accent }}
    >
      <span className="cat-icon">
        <Icon />
      </span>
      <span>
        <b>{category.name}</b>
        <span>
          {count} addon{count === 1 ? '' : 's'}
        </span>
      </span>
    </Link>
  );
}

export function CreatorCard({ creator }: { creator: Creator }) {
  const count = getAddonsByCreator(creator.id).length;
  const initials = creator.name.slice(0, 2).toUpperCase();
  return (
    <Link to={`/creator/${creator.id}`} className="creator-card">
      <span
        className="avatar"
        style={{ background: `linear-gradient(145deg, hsl(${creator.avatarHue} 45% 32%), hsl(${creator.avatarHue} 55% 16%))` }}
      >
        {initials}
      </span>
      <h3>
        {creator.name}
        {creator.verified && <BadgeCheck aria-label="Criador verificado" />}
      </h3>
      <p>
        {count} addon{count === 1 ? '' : 's'} publicados
      </p>
    </Link>
  );
}
