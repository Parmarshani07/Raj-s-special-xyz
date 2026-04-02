/**
 * Map of COCO-SSD class names to display names and colors
 */

export const CLASS_INFO: Record<string, { name: string; color: string; icon: string }> = {
  person: { name: 'Pedestrian', color: '#22c55e', icon: '🚶' },
  car: { name: 'Car', color: '#3b82f6', icon: '🚗' },
  truck: { name: 'Truck', color: '#f59e0b', icon: '🚚' },
  bus: { name: 'Bus', color: '#8b5cf6', icon: '🚌' },
  motorcycle: { name: 'Motorcycle', color: '#ef4444', icon: '🏍️' },
  bicycle: { name: 'Bicycle', color: '#14b8a6', icon: '🚴' },
  'stop sign': { name: 'Stop Sign', color: '#dc2626', icon: '🛑' },
  'traffic light': { name: 'Traffic Light', color: '#eab308', icon: '🚦' },
  bench: { name: 'Bench', color: '#a8a29e', icon: '🪑' },
  dog: { name: 'Dog', color: '#f97316', icon: '🐕' },
  cat: { name: 'Cat', color: '#fb923c', icon: '🐱' },
  bird: { name: 'Bird', color: '#a3e635', icon: '🐦' },
  horse: { name: 'Horse', color: '#b45309', icon: '🐴' },
  sheep: { name: 'Sheep', color: '#78716c', icon: '🐑' },
  cow: { name: 'Cow', color: '#0f766e', icon: '🐄' },
  elephant: { name: 'Elephant', color: '#7c3aed', icon: '🐘' },
  bear: { name: 'Bear', color: '#854d0e', icon: '🐻' },
  zebra: { name: 'Zebra', color: '#f5f5f4', icon: '🦓' },
  giraffe: { name: 'Giraffe', color: '#d97706', icon: '🦒' },
  backpack: { name: 'Backpack', color: '#ec4899', icon: '🎒' },
  umbrella: { name: 'Umbrella', color: '#06b6d4', icon: '☂️' },
  handbag: { name: 'Handbag', color: '#f472b6', icon: '👜' },
  tie: { name: 'Tie', color: '#6366f1', icon: '👔' },
  suitcase: { name: 'Suitcase', color: '#78350f', icon: '🧳' },
 frisbee: { name: 'Frisbee', color: '#0891b2', icon: '🥏' },
  skis: { name: 'Skis', color: '#0ea5e9', icon: '🎿' },
  snowboard: { name: 'Snowboard', color: '#38bdf8', icon: '🏂' },
  'sports ball': { name: 'Sports Ball', color: '#fbbf24', icon: '⚽' },
  kite: { name: 'Kite', color: '#4ade80', icon: '🪁' },
  'baseball bat': { name: 'Baseball Bat', color: '#a16207', icon: '🏏' },
  'baseball glove': { name: 'Baseball Glove', color: '#ca8a04', icon: '🧤' },
  skateboard: { name: 'Skateboard', color: '#ef4444', icon: '🛹' },
  surfboard: { name: 'Surfboard', color: '#0ea5e9', icon: '🏄' },
  'tennis racket': { name: 'Tennis Racket', color: '#84cc16', icon: '🎾' },
  bottle: { name: 'Bottle', color: '#22d3ee', icon: '🍼' },
  'wine glass': { name: 'Wine Glass', color: '#e11d48', icon: '🍷' },
  cup: { name: 'Cup', color: '#facc15', icon: '☕' },
  fork: { name: 'Fork', color: '#94a3b8', icon: '🍴' },
  knife: { name: 'Knife', color: '#64748b', icon: '🔪' },
  spoon: { name: 'Spoon', color: '#cbd5e1', icon: '🥄' },
  bowl: { name: 'Bowl', color: '#fde047', icon: '🥣' },
  banana: { name: 'Banana', color: '#fde047', icon: '🍌' },
  apple: { name: 'Apple', color: '#ef4444', icon: '🍎' },
  sandwich: { name: 'Sandwich', color: '#d97706', icon: '🥪' },
  orange: { name: 'Orange', color: '#f97316', icon: '🍊' },
  broccoli: { name: 'Broccoli', color: '#22c55e', icon: '🥦' },
  carrot: { name: 'Carrot', color: '#f97316', icon: '🥕' },
  'hot dog': { name: 'Hot Dog', color: '#b91c1c', icon: '🌭' },
  pizza: { name: 'Pizza', color: '#eab308', icon: '🍕' },
  donut: { name: 'Donut', color: '#d946ef', icon: '🍩' },
  cake: { name: 'Cake', color: '#fb923c', icon: '🎂' },
  chair: { name: 'Chair', color: '#78716c', icon: '🪑' },
  couch: { name: 'Couch', color: '#a8a29e', icon: '🛋️' },
  'potted plant': { name: 'Potted Plant', color: '#22c55e', icon: '🪴' },
  bed: { name: 'Bed', color: '#f5f5f4', icon: '🛏️' },
  'dining table': { name: 'Dining Table', color: '#78350f', icon: '🪵' },
  toilet: { name: 'Toilet', color: '#f5f5f4', icon: '🚽' },
  tv: { name: 'TV', color: '#1e293b', icon: '📺' },
  laptop: { name: 'Laptop', color: '#64748b', icon: '💻' },
  mouse: { name: 'Mouse', color: '#94a3b8', icon: '🖱️' },
  remote: { name: 'Remote', color: '#475569', icon: '📱' },
  keyboard: { name: 'Keyboard', color: '#334155', icon: '⌨️' },
  'cell phone': { name: 'Cell Phone', color: '#1e293b', icon: '📱' },
  microwave: { name: 'Microwave', color: '#71717a', icon: '📦' },
  oven: { name: 'Oven', color: '#71717a', icon: '🔥' },
  toaster: { name: 'Toaster', color: '#a8a29e', icon: '🍞' },
  sink: { name: 'Sink', color: '#e2e8f0', icon: '🚰' },
  refrigerator: { name: 'Refrigerator', color: '#f8fafc', icon: '🧊' },
  book: { name: 'Book', color: '#ef4444', icon: '📚' },
  clock: { name: 'Clock', color: '#eab308', icon: '🕐' },
  vase: { name: 'Vase', color: '#a3e635', icon: '🏺' },
  scissors: { name: 'Scissors', color: '#94a3b8', icon: '✂️' },
  'teddy bear': { name: 'Teddy Bear', color: '#b45309', icon: '🧸' },
  'hair drier': { name: 'Hair Drier', color: '#a8a29e', icon: '💨' },
  toothbrush: { name: 'Toothbrush', color: '#0891b2', icon: '🪥' },
};

export function getClassInfo(className: string) {
  return CLASS_INFO[className] || { name: className, color: '#94a3b8', icon: '❓' };
}

export function getRiskColor(score: number): string {
  if (score >= 75) return '#dc2626';
  if (score >= 50) return '#f59e0b';
  if (score >= 25) return '#eab308';
  return '#22c55e';
}

export function getRiskLabel(score: number): string {
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Medium';
  return 'Low';
}